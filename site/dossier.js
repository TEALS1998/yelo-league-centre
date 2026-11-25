/* ملف الموسم · The Season File
   One printable dossier for the club: cover, contents, six chapters and a back page.
   Every page is A4 and is built from the live data on the page (SEA, MATCHES, LEAGUE_DATA, DISCIPLINE, PREDICT).
   Arabic leads, English follows. Each chapter can also be printed on its own.
   المؤلفة: تريم إياد السقاف · كُتب بمساعدة أداة Claude بتوجيهها */
(function () {
  "use strict";
  const W = window;

  /* ---------- palette and small helpers ---------- */
  const C = { ink: "#14202e", ink2: "#24364a", sand: "#c9a46a", rock: "#b5643c", paper: "#f4efe6", bone: "#ebe3d4", line: "#d8cfbd", mute: "#7c7466",
    W: "#2f7d55", D: "#c49a3a", L: "#b5483c", soft: "#efe8db" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MA = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const ME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DA = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dt = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const dA = iso => { const t = dt(iso); return `${t.getUTCDate()} ${MA[t.getUTCMonth()]}`; };
  const dAL = iso => { const t = dt(iso); return `${DA[t.getUTCDay()]} ${t.getUTCDate()} ${MA[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
  const dE = iso => { const t = dt(iso); return `${t.getUTCDate()} ${ME[t.getUTCMonth()]}`; };
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const n0 = x => Math.round(x).toLocaleString("en");
  const pc = x => x >= .995 && x < 1 ? ">99%" : x <= .005 && x > 0 ? "<1%" : Math.round(x * 100) + "%";
  const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const WXA = { sun: "مشمس", clear: "صافٍ", partly: "غائم جزئياً", cloud: "غائم", rain: "ممطر", wind: "رياح", fog: "ضباب", dust: "غبار" };

  /* ---------- the data, read once per build ---------- */
  function ctx() {
    const G = { US: "العلا" };
    try { G.US = eval("US"); } catch (e) {}
    try { G.EN = eval("US_EN"); } catch (e) { G.EN = G.US; }
    try { G.SEA = eval("SEA"); } catch (e) {}
    try { G.MS = eval("MATCHES"); } catch (e) { G.MS = []; }
    try { G.CREST = eval("CREST"); } catch (e) {}
    try { G.LOGOS = eval("LOGOS"); } catch (e) { G.LOGOS = {}; }
    try { G.TEN = eval("TEN"); } catch (e) { G.TEN = {}; }
    try { G.DATA = eval("DATA"); } catch (e) { G.DATA = {}; }
    try { G.SKEY = eval("SKEY"); } catch (e) {}
    try { G.BASE = eval("BASE"); } catch (e) { G.BASE = W.BASE || {}; }
    const LD = W.LEAGUE_DATA, LS = LD && LD.seasons && (LD.seasons[G.SKEY] || LD.seasons[LD.current]);
    G.LM = (LS && LS.matches || []).filter(m => m.comp === "league");
    G.rows = ((G.SEA.table && G.SEA.table.rows) || []).slice().sort((a, b) => a[1] - b[1]);
    G.teams = G.rows.map(r => r[0]);
    G.row = n => G.rows.find(r => r[0] === n);
    G.tn = n => (G.TEN && G.TEN[n]) || n;
    G.logo = n => n === G.US ? G.CREST : (G.LOGOS && G.LOGOS[n]) || "";
    G.img = (n, cls) => { const s = G.logo(n); return s ? `<img class="${cls || ""}" src="${esc(s)}" alt="">` : `<span class="${cls || ""} nolg"></span>`; };
    G.mine = G.MS.slice().sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : 1);
    G.played = G.mine.filter(m => m.status === "played" && m.score);
    G.playedL = G.played.filter(m => m.comp === "league");
    const ko = m => { const [y, mo, d] = m.date.split("-").map(Number); const [h, mi] = (m.time || "20:00").split(":").map(Number); return Date.UTC(y, mo - 1, d, h - 3, mi); };
    G.next = G.mine.filter(m => m.status === "upcoming" && m.date && ko(m) > Date.now() - 2 * 36e5).sort((a, b) => ko(a) - ko(b))[0];
    G.opp = m => m.home === G.US ? m.away : m.home;
    G.fa = m => { const f = m.home === G.US ? m.score[0] : m.score[1], g = m.home === G.US ? m.score[1] : m.score[0]; return [f, g]; };
    G.res = m => { const [f, g] = G.fa(m); return f > g ? "W" : f < g ? "L" : "D"; };
    G.ven = v => (G.DATA.venues || {})[v] || null;
    G.ll = v => { const g = G.ven(v); return g && typeof g[1] === "number" ? [g[1], g[2]] : null; };
    G.cityOf = v => { const x = String(v || "").match(/\(([^)]+)\)\s*$/); return x ? x[1] : ""; };
    G.homeOf = t => ((G.DATA.clubs || {})[t] || {}).home;
    G.label = (G.SEA.label && (G.SEA.label[1] || G.SEA.label[0])) || G.SKEY || "";
    G.round = G.SEA.currentRound || Math.max(0, ...G.playedL.map(m => +m.round || 0));
    G.N = G.SEA.totalRounds || 34;
    G.PD = { direct: 2, playoff: [3, 6] };
    G.author = (W.AUTHOR && (W.AUTHOR.ar || W.AUTHOR.en)) || "";
    return G;
  }

  /* ---------- league maths ---------- */
  function standings(G, upto) {
    const T = {}; G.teams.forEach(t => T[t] = { t, p: 0, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 });
    G.LM.filter(m => m.status === "played" && Array.isArray(m.score) && (!upto || m.date <= upto)).forEach(m => {
      const h = T[m.home], a = T[m.away]; if (!h || !a) return; const [x, y] = m.score;
      h.p++; a.p++; h.gf += x; h.ga += y; a.gf += y; a.ga += x;
      if (x > y) { h.pts += 3; h.w++; a.l++; } else if (x < y) { a.pts += 3; a.w++; h.l++; } else { h.pts++; a.pts++; h.d++; a.d++; }
    });
    const L = Object.values(T).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.t.localeCompare(b.t));
    L.forEach((r, i) => r.pos = i + 1); return L;
  }
  /* where we stood after each of our league matches */
  function path(G) {
    return G.playedL.map(m => { const L = standings(G, m.date), me = L.find(r => r.t === G.US); return { m, pos: me ? me.pos : null, pts: me ? me.pts : 0, lead: L[0].pts }; });
  }
  /* Monte Carlo of the rest of the season with the Dixon-Coles model in predict.js */
  function simulate(G, N) {
    const P = W.PREDICT; if (!P) return null;
    const model = P.fit(P.played({ matches: G.LM })); if (!model) return null;
    const done = new Set(G.LM.filter(m => m.status === "played").map(m => m.home + "|" + m.away));
    const left = []; G.teams.forEach(h => G.teams.forEach(a => { if (h !== a && !done.has(h + "|" + a)) left.push([h, a]); }));
    const probs = left.map(([h, a]) => { const r = P.match(model, h, a); return r ? { h, a, pw: r.pw, pd: r.pd, pl: r.pl } : null; }).filter(Boolean);
    const base = standings(G); const st = {}; base.forEach(r => st[r.t] = { pos: [], pts: [], top2: 0, top6: 0, win: 0 });
    let seed = 20261125; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed + .5) / 4294967296; };
    const gau = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
    const poi = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L && k < 15); return k - 1; };
    const SD = 0.14; // how unsure we are about each club's true strength after a dozen games
    for (let k = 0; k < N; k++) {
      const T = {}, ea = {}, ed = {}; base.forEach(r => { T[r.t] = { t: r.t, pts: r.pts, gd: r.gf - r.ga, gf: r.gf }; ea[r.t] = gau() * SD; ed[r.t] = gau() * SD; });
      probs.forEach(p => { const h = T[p.h], a = T[p.a]; if (!(p.h in model.A) || !(p.a in model.A)) return;
        const x = poi(Math.exp(model.c + model.H + model.A[p.h] + ea[p.h] + model.D[p.a] + ed[p.a])), y = poi(Math.exp(model.c + model.A[p.a] + ea[p.a] + model.D[p.h] + ed[p.h]));
        h.gf += x; a.gf += y; h.gd += x - y; a.gd += y - x;
        if (x > y) h.pts += 3; else if (x < y) a.pts += 3; else { h.pts++; a.pts++; } });
      Object.values(T).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || rnd() - .5).forEach((r, i) => {
        const s = st[r.t]; s.pos.push(i + 1); s.pts.push(r.pts); if (i === 0) s.win++; if (i < G.PD.direct) s.top2++; if (i < G.PD.playoff[1]) s.top6++; });
    }
    const q = (a, f) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
    const out = base.map(r => { const s = st[r.t]; return { t: r.t, now: r.pts, pos: r.pos, p: r.p, lo: q(s.pts, .1), mid: q(s.pts, .5), hi: q(s.pts, .9),
      top2: s.top2 / N, top6: s.top6 / N, win: s.win / N, avgPos: s.pos.reduce((x, y) => x + y, 0) / N }; });
    out.sort((a, b) => b.mid - a.mid || a.avgPos - b.avgPos);
    // how hard each club's remaining games are: average chance of a point lost against the model
    // how hard what is left is: the average points per game of the opponents still to play
    const ppg = {}; base.forEach(r => ppg[r.t] = r.p ? r.pts / r.p : 0);
    const sos = {}; G.teams.forEach(t => { const mine = probs.filter(p => p.h === t || p.a === t);
      const o = mine.reduce((s, p) => s + ppg[p.h === t ? p.a : p.h], 0); sos[t] = { n: mine.length, ppg: mine.length ? o / mine.length : 0 }; });
    return { rows: out, left: probs.length, model, sos, N };
  }
  /* away kilometres for every club, from its home ground to each away venue it has played or is due at */
  function travel(G) {
    const res = {}; G.teams.forEach(t => { const h = G.ll(G.homeOf(t)); let done = 0, all = 0;
      G.LM.filter(m => m.away === t).forEach(m => { const v = m.venue || G.homeOf(m.home), p = G.ll(v); if (!h || !p) return; const k = hav(h, p) * 2; all += k; if (m.status === "played") done += k; });
      res[t] = { done, all }; }); return res;
  }

  /* ---------- auto-written headlines ---------- */
  function headlines(G, sim) {
    const L = standings(G), me = L.find(r => r.t === G.US), out = [];
    if (me) {
      if (me.pos === 1) { const g = me.pts - L[1].pts; out.push([`${esc(G.US)} في الصدارة بـ${me.pts} نقطة${g > 0 ? `، بفارق ${g} ${g === 1 ? "نقطة" : g === 2 ? "نقطتين" : "نقاط"} عن ${esc(L[1].t)}` : `، بالتساوي مع ${esc(L[1].t)}`}.`, `Top of the league on ${me.pts} points.`]); }
      else { const g = L[0].pts - me.pts; out.push([`${esc(G.US)} في المركز ${me.pos} بـ${me.pts} نقطة، على بعد ${g} من الصدارة.`, `${me.pos}th on ${me.pts} points, ${g} off the top.`]); }
      const ga = L.slice().sort((a, b) => a.ga - b.ga)[0], gf = L.slice().sort((a, b) => b.gf - a.gf)[0];
      if (ga.t === G.US) out.push([`أصلب دفاع في الدوري: ${me.ga} ${me.ga > 10 ? "هدفاً" : "أهداف"} فقط في ${me.p} مباريات.`, `Best defence in the league: ${me.ga} conceded in ${me.p}.`]);
      if (gf.t === G.US) out.push([`أقوى هجوم في الدوري: ${me.gf} هدفاً، بمعدل ${(me.gf / me.p).toFixed(1)} في المباراة.`, `Best attack: ${me.gf} goals, ${(me.gf / me.p).toFixed(1)} a game.`]);
    }
    let run = 0; for (let i = G.playedL.length - 1; i >= 0 && G.res(G.playedL[i]) !== "L"; i--) run++;
    if (run >= 4) out.push([`${run} مباراة في الدوري بدون خسارة على التوالي.`, `${run} league games unbeaten in a row.`]);
    if (sim) { const r = sim.rows.find(x => x.t === G.US); if (r) out.push([`النموذج يعطي ${esc(G.US)} فرصة ${pc(r.top2)} للصعود المباشر، ونهاية متوقعة عند ${r.mid} نقطة تقريباً.`, `Model: ${pc(r.top2)} chance of direct promotion, about ${r.mid} points.`]); }
    return out.slice(0, 4);
  }

  /* ---------- page frame ---------- */
  const CH = [
    { k: "season", n: "01", ar: "الموسم حتى الآن", en: "The season so far" },
    { k: "match", n: "02", ar: "المباراة القادمة", en: "Next match" },
    { k: "race", n: "03", ar: "سباق الصعود", en: "The promotion race" },
    { k: "road", n: "04", ar: "الطريق", en: "On the road" },
    { k: "discipline", n: "05", ar: "الانضباط", en: "Discipline" },
    { k: "changes", n: "06", ar: "سجل التعديلات", en: "Fixture changes" }
  ];
  let PG = 0, TOTAL = 0;
  const tabs = k => `<div class="dz-tabs">${CH.map(c => `<span class="${c.k === k ? "on" : ""}"><b>${c.n}</b>${c.k === k ? `<i>${c.ar}</i>` : ""}</span>`).join("")}</div>`;
  const frame = (G, k, body, opt) => { PG++; const c = CH.find(x => x.k === k) || {};
    return `<section class="rps fix dz dz-${k}${opt && opt.dark ? " dark" : ""}">${tabs(k)}
      <header class="dz-run"><span>${G.img(G.US, "cr")}<b>ملف الموسم</b><em>THE SEASON FILE · ${esc(G.EN).toUpperCase()}</em></span><span><em>${esc(c.en || "").toUpperCase()}</em><b>${esc(c.ar || "")}</b></span></header>
      <div class="dz-body">${body}</div>
      <footer class="dz-foot"><span>${esc(G.label)} · حتى ${dAL(today())}</span><span>المصدر: موقع الاتحاد السعودي لكرة القدم · ${esc(G.author)}</span><b>${String(PG).padStart(2, "0")}<small>/${String(TOTAL).padStart(2, "0")}</small></b></footer></section>`; };
  const opener = (c, stand) => `<div class="dz-op"><div class="dz-num">${c.n}</div><div><div class="dz-kick">${esc(c.en).toUpperCase()}</div><h1>${esc(c.ar)}</h1>${stand ? `<p>${stand}</p>` : ""}</div></div>`;
  const H = (ar, en, note) => `<div class="dz-h"><b>${ar}</b><span>${en}</span>${note ? `<small>${note}</small>` : ""}</div>`;

  /* ---------- cover: the season's fingerprint ---------- */
  function cover(G, sim) {
    PG++;
    const byR = {}; G.mine.filter(m => m.comp === "league" && typeof m.round === "number").forEach(m => { if (!byR[m.round] || m.status === "played") byR[m.round] = m; });
    const cx = 100, cy = 100, R0 = 34, N = G.N; let rays = "";
    for (let r = 1; r <= N; r++) {
      const a = -Math.PI / 2 + (r - 1) / N * Math.PI * 2, m = byR[r], ca = Math.cos(a), sa = Math.sin(a);
      if (m && m.status === "played" && m.score) { const [f, g] = G.fa(m), col = C[G.res(m)], L1 = R0 + 10 + f * 9, L0 = R0 + 6 - g * 4;
        rays += `<line x1="${cx + ca * Math.max(18, L0)}" y1="${cy + sa * Math.max(18, L0)}" x2="${cx + ca * L1}" y2="${cy + sa * L1}" stroke="${col}" stroke-width="3.1" stroke-linecap="round"/>`;
        rays += `<circle cx="${cx + ca * (L1 + 4.2)}" cy="${cy + sa * (L1 + 4.2)}" r="1.1" fill="${col}"/>`;
      } else { const nx = G.next && m && m.id === G.next.id;
        rays += `<line x1="${cx + ca * (R0 + 4)}" y1="${cy + sa * (R0 + 4)}" x2="${cx + ca * (R0 + 10)}" y2="${cy + sa * (R0 + 10)}" stroke="${nx ? C.sand : "rgba(244,239,230,.22)"}" stroke-width="${nx ? 3 : 1.4}" stroke-linecap="round"${nx ? ' class="dz-blink"' : ""}/>`; }
      if (r === 1 || r % 5 === 0 || r === N) rays += `<text x="${cx + ca * (R0 + 58)}" y="${cy + sa * (R0 + 58) + 1.4}" font-size="3.6" fill="rgba(244,239,230,.45)" text-anchor="middle" font-family="var(--dinc)">${r}</text>`;
    }
    const L = standings(G), me = L.find(r => r.t === G.US) || {}, s = sim && sim.rows.find(x => x.t === G.US);
    const big = [[me.pos || "-", "المركز", "POSITION"], [me.pts || 0, "نقطة", "POINTS"], [`${me.w || 0}-${me.d || 0}-${me.l || 0}`, "فوز تعادل خسارة", "W-D-L"], [s ? pc(s.top2) : "—", "فرصة الصعود المباشر", "DIRECT PROMOTION"]];
    return `<section class="rps fix dz dz-cover">
      <div class="dz-cv-top"><span>FIRST DIVISION LEAGUE · دوري يلو للدرجة الأولى</span><span>${esc(G.label)}</span></div>
      <div class="dz-cv-t"><div class="dz-cv-k">THE SEASON FILE</div><h1>ملف الموسم</h1><div class="dz-cv-c">${esc(G.US)} <span>· ${esc(G.EN)}</span></div></div>
      <div class="dz-fp"><svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${R0 + 2}" fill="none" stroke="rgba(244,239,230,.12)"/><circle cx="100" cy="100" r="${R0 + 48}" fill="none" stroke="rgba(244,239,230,.07)" stroke-dasharray="1 2"/>
        ${rays}</svg>
        <div class="dz-fpc">${G.img(G.US)}</div></div>
      <div class="dz-cv-key"><span><i style="background:${C.W}"></i>فوز</span><span><i style="background:${C.D}"></i>تعادل</span><span><i style="background:${C.L}"></i>خسارة</span><span><i class="sd"></i>المباراة الجاية</span>
        <em>كل خط جولة من جولات الدوري الـ${N}: طوله للخارج أهدافنا، وبدايته من الداخل أهداف الخصم. الخطوط الباهتة جولات لسا ما انلعبت.</em></div>
      <div class="dz-cv-big">${big.map(b => `<div><b>${b[0]}</b><span>${b[1]}</span><small>${b[2]}</small></div>`).join("")}</div>
      <div class="dz-cv-f"><span>حتى الجولة ${G.round} · ${dAL(today())}</span><span>${esc(G.author)}</span></div></section>`;
  }

  /* ---------- contents and the season in short ---------- */
  function contents(G, sim, pages) {
    PG++;
    const L = standings(G), me = L.find(r => r.t === G.US) || { p: 0, gf: 0, ga: 0 };
    const cs = G.playedL.filter(m => G.fa(m)[1] === 0).length;
    const tv = travel(G)[G.US] || { done: 0 };
    const nums = [[me.gf, "هدف سجلناه", "GOALS FOR"], [me.ga, "هدف استقبلناه", "GOALS AGAINST"], [cs, "مباراة بشباك نظيفة", "CLEAN SHEETS"],
      [me.p ? (me.pts / me.p).toFixed(2) : "0", "نقطة في المباراة", "POINTS PER GAME"], [n0(tv.done / 1000 * 10) / 10 + "k", "كم قطعناها في السفر", "KM TRAVELLED"], [G.played.length, "مباراة في كل البطولات", "MATCHES PLAYED"]];
    const hl = headlines(G, sim);
    return `<section class="rps fix dz dz-toc">
      <header class="dz-run"><span>${G.img(G.US, "cr")}<b>ملف الموسم</b><em>THE SEASON FILE</em></span><span><em>CONTENTS</em><b>المحتويات</b></span></header>
      <div class="dz-body">
        <div class="dz-toc-g"><div><div class="dz-kick">IN THIS FILE</div><h2>في هذا الملف</h2>
          <ol>${CH.map(c => `<li><b>${c.n}</b><span>${c.ar}<small>${c.en}</small></span><i>${String(pages[c.k] || "").padStart(2, "0")}</i></li>`).join("")}</ol></div>
          <div class="dz-hl"><div class="dz-kick">THE HEADLINES</div><h2>العناوين</h2>${hl.map((h, i) => `<p><b>${String(i + 1).padStart(2, "0")}</b><span>${h[0]}<small>${h[1]}</small></span></p>`).join("")}</div></div>
        ${H("الموسم في ستة أرقام", "THE SEASON IN SIX NUMBERS")}
        <div class="dz-six">${nums.map(x => `<div><b>${x[0]}</b><span>${x[1]}</span><small>${x[2]}</small></div>`).join("")}</div>
        ${(() => { const P = W.PREDICT; let md = null; try { md = P && P.fit(P.played({ matches: G.LM })); } catch (e) {}
          const nx = G.mine.filter(m => m.status !== "played" && m.status !== "expected" && m.date && m.date >= today()).slice(0, 5); if (!nx.length) return "";
          return `${H("الخمس الجاية", "THE NEXT FIVE", "فرصة الفوز حسب النموذج")}<div class="dz-n5">${nx.map(m => { const r = md && P.match(md, m.home, m.away), w = r ? (m.home === G.US ? r.pw : r.pl) : null;
            return `<div>${G.img(G.opp(m), "lg")}<b>${esc(G.opp(m))}</b><span>${m.home === G.US ? "في أرضنا" : "خارج"} · ${dA(m.date)}</span>${w != null ? `<em><i style="width:${w * 100}%"></i></em><strong>${pc(w)}</strong>` : `<span>كأس</span>`}</div>`; }).join("")}</div>`; })()}
        <div class="dz-how"><b>كيف تقرئين هذا الملف</b> كل الأرقام من نتائج الاتحاد المنشورة، وتتحدث كل ما انلعبت مباراة. التوقعات (المباراة القادمة وسباق الصعود) من نموذج إحصائي مبني على نتائج الدوري هذا الموسم، ومشروحة في الصفحة الأخيرة. الأرقام بالأخضر لصالحنا، وبالأحمر ضدنا.</div>
      </div>
      <footer class="dz-foot"><span>${esc(G.label)} · حتى ${dAL(today())}</span><span>المصدر: موقع الاتحاد السعودي لكرة القدم · ${esc(G.author)}</span><b>${String(PG).padStart(2, "0")}<small>/${String(TOTAL).padStart(2, "0")}</small></b></footer></section>`;
  }

  /* ---------- 01 the season so far ---------- */
  function chSeason(G) {
    const P = path(G), N = Math.min(G.teams.length || 18, Math.max(8, ...P.map(p => p.pos + 2))), Wd = 180, Hh = 64, n = Math.max(P.length, 1);
    const x = i => 8 + i * (Wd - 16) / Math.max(1, n - 1), y = p => 6 + (p - 1) * (Hh - 12) / (N - 1);
    const pts = P.map((p, i) => `${x(i).toFixed(1)},${y(p.pos).toFixed(1)}`).join(" ");
    const zone = `<rect x="0" y="${y(.5)}" width="${Wd}" height="${y(G.PD.direct + .5) - y(.5)}" fill="${C.W}" opacity=".08"/><rect x="0" y="${y(G.PD.direct + .5)}" width="${Wd}" height="${y(G.PD.playoff[1] + .5) - y(G.PD.direct + .5)}" fill="${C.sand}" opacity=".1"/>`;
    const grid = [1, 2, 6, N].filter((v, i, a) => a.indexOf(v) === i && v <= N).map(p => `<line x1="0" x2="${Wd}" y1="${y(p)}" y2="${y(p)}" stroke="${C.line}" stroke-width=".2"/><text x="${Wd + 1.5}" y="${y(p) + 1.2}" font-size="3" fill="${C.mute}">${p}</text>`).join("");
    const dots = P.map((p, i) => { const r = G.res(p.m); return `<circle cx="${x(i)}" cy="${y(p.pos)}" r="2.3" fill="${C[r]}" stroke="${C.paper}" stroke-width=".7"/><image href="${esc(G.logo(G.opp(p.m)))}" x="${x(i) - 2.6}" y="${Hh + 1}" width="5.2" height="5.2"/><text x="${x(i)}" y="${Hh + 10.5}" font-size="2.6" fill="${C.mute}" text-anchor="middle">${p.m.round}</text>`; }).join("");
    const chart = `<svg viewBox="-2 0 ${Wd + 8} ${Hh + 13}" class="dz-path" style="direction:ltr">${zone}${grid}<polyline points="${pts}" fill="none" stroke="${C.ink}" stroke-width="1" stroke-linejoin="round" class="dz-draw"/>${dots}
      <text x="${Wd - 2}" y="${y(1.6)}" font-size="2.6" fill="${C.W}" text-anchor="end">صعود مباشر</text><text x="${Wd - 2}" y="${y(4.6)}" font-size="2.6" fill="#9a7a3a" text-anchor="end">الملحق</text></svg>`;
    // every match as a ticket stub
    const stubs = G.played.map(m => { const r = G.res(m), [f, g] = G.fa(m), hm = m.home === G.US;
      return `<div class="dz-stub ${r}"><span class="w">${m.comp === "cup" ? "كأس" : "ج" + m.round}</span>${G.img(G.opp(m), "lg")}<b>${f}<i>-</i>${g}</b><span class="o">${esc(G.opp(m))}</span><small>${hm ? "أرضنا" : "خارج"} · ${dA(m.date)}</small></div>`; }).join("");
    // home and away split
    const split = k => { const ms = G.playedL.filter(m => k === "h" ? m.home === G.US : m.away === G.US), c = { W: 0, D: 0, L: 0 }; let f = 0, g = 0;
      ms.forEach(m => { c[G.res(m)]++; const [a, b] = G.fa(m); f += a; g += b; }); const pts = c.W * 3 + c.D;
      return { n: ms.length, c, f, g, pts, ppg: ms.length ? pts / ms.length : 0 }; };
    const hs = split("h"), as = split("a");
    const bar = s => `<div class="dz-wdl">${["W", "D", "L"].map(k => s.c[k] ? `<i style="flex:${s.c[k]};background:${C[k]}">${s.c[k]}</i>` : "").join("")}</div>`;
    const sp = (t, en, s) => `<div class="dz-sp"><div class="h"><b>${t}</b><span>${en}</span></div><div class="n"><b>${s.ppg.toFixed(2)}</b><span>نقطة في المباراة</span></div>${bar(s)}<div class="g"><span>له <b>${s.f}</b></span><span>عليه <b>${s.g}</b></span><span>مباريات <b>${s.n}</b></span></div></div>`;
    // goals per match bars
    const gm = G.playedL.map(m => { const [f, g] = G.fa(m); return `<div class="dz-gb"><i class="f" style="height:${f * 7}mm"></i><i class="a" style="height:${g * 7}mm"></i><span>${m.round}</span></div>`; }).join("");
    // season records
    const all = G.played; let best = null, most = null, run = 0, br = 0, cs = 0, bcs = 0;
    all.forEach(m => { const [f, g] = G.fa(m); if (!best || f - g > best.d) best = { m, d: f - g, f, g }; if (!most || f + g > most.n) most = { m, n: f + g, f, g };
      if (G.res(m) !== "L") { run++; br = Math.max(br, run); } else run = 0; if (g === 0) { cs++; bcs = Math.max(bcs, cs); } else cs = 0; });
    const rec = [best && [`${best.f}-${best.g}`, "أكبر فوز", `ضد ${esc(G.opp(best.m))} · ${dA(best.m.date)}`], most && [`${most.n}`, "أكثر مباراة أهدافاً", `${most.f}-${most.g} ضد ${esc(G.opp(most.m))}`],
      [`${br}`, "أطول سلسلة بلا خسارة", "مباراة متتالية في كل البطولات"], [`${bcs}`, "أطول سلسلة بشباك نظيفة", "مباراة متتالية"]].filter(Boolean);
    const recH = `${H("أرقام الموسم", "SEASON RECORDS")}<div class="dz-rec">${rec.map(r => `<div><b>${r[0]}</b><span>${r[1]}</span><small>${r[2]}</small></div>`).join("")}</div>`;
    const me = standings(G).find(r => r.t === G.US) || {};
    const stand = `${esc(G.US)} ${me.pos === 1 ? "تتصدر" : "في المركز " + me.pos} بعد ${me.p} مباريات في الدوري، ${me.w} فوز و${me.d} تعادل و${me.l} خسارة.`;
    return frame(G, "season", `${opener(CH[0], stand)}
      ${H("مسار الترتيب", "LEAGUE POSITION AFTER EACH MATCH", "الخط يبين مركزنا بعد كل مباراة، والنقطة لونها حسب النتيجة")}${chart}
      ${H("كل المباريات", "EVERY MATCH, ALL COMPETITIONS")}<div class="dz-stubs">${stubs}</div>
      <div class="dz-2"><div>${H("في أرضنا وخارجها", "HOME AND AWAY")}<div class="dz-sps">${sp("في أرضنا", "HOME", hs)}${sp("خارج أرضنا", "AWAY", as)}</div></div>
        <div>${H("الأهداف في كل مباراة", "GOALS PER LEAGUE MATCH", "أخضر لنا، أحمر علينا")}<div class="dz-gbs">${gm}</div></div></div>${recH}`);
  }

  /* ---------- 02 next match ---------- */
  function chMatch(G) {
    const m = G.next; if (!m) return frame(G, "match", `${opener(CH[1])}<p class="dz-empty">ما فيه مباراة معلنة حالياً.</p>`);
    const o = G.opp(m), hm = m.home === G.US, L = standings(G), a = L.find(r => r.t === G.US) || {}, b = L.find(r => r.t === o) || null;
    const P = W.PREDICT; let pr = null; try { const md = P && P.fit(P.played({ matches: G.LM })); pr = md && P.match(md, m.home, m.away); } catch (e) {}
    const us = pr ? (hm ? [pr.pw, pr.pd, pr.pl] : [pr.pl, pr.pd, pr.pw]) : null;
    const form = t => G.LM.filter(x => x.status === "played" && x.score && (x.home === t || x.away === t)).sort((p, q) => p.date < q.date ? -1 : 1).slice(-5)
      .map(x => { const f = x.home === t ? x.score[0] : x.score[1], g = x.home === t ? x.score[1] : x.score[0]; const r = f > g ? "W" : f < g ? "L" : "D"; return `<i style="background:${C[r]}">${{ W: "ف", D: "ت", L: "خ" }[r]}</i>`; }).join("");
    const tape = b ? [["النقاط", "Points", a.pts, b.pts], ["الأهداف له في المباراة", "Scored per game", +(a.gf / a.p).toFixed(2), +(b.gf / b.p).toFixed(2)],
      ["الأهداف عليه في المباراة", "Conceded per game", +(a.ga / a.p).toFixed(2), +(b.ga / b.p).toFixed(2), true], ["الفوز", "Wins", a.w, b.w], ["الخسارة", "Losses", a.l, b.l, true]] : [];
    const tapeH = tape.map(([ar, en, x, y, low]) => { const mx = Math.max(x, y, .01), bx = low ? x < y : x > y, by = low ? y < x : y > x;
      return `<div class="dz-tp"><b class="${bx ? "win" : ""}">${x}</b><div class="l"><i style="width:${x / mx * 100}%"></i></div><span>${ar}<small>${en}</small></span><div class="r"><i style="width:${y / mx * 100}%"></i></div><b class="${by ? "win" : ""}">${y}</b></div>`; }).join("");
    let grid = ""; if (pr) { const hx = hm ? (i, j) => pr.M[i][j] : (i, j) => pr.M[j][i]; let mx = 0; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) mx = Math.max(mx, hx(i, j));
      for (let i = 4; i >= 0; i--) { grid += `<div class="r"><span class="lb">${i}</span>`; for (let j = 0; j <= 4; j++) { const p = hx(i, j), c = i > j ? C.W : i === j ? C.D : C.L;
        grid += `<i style="background:${c};opacity:${(.12 + .88 * p / mx).toFixed(2)}">${p >= .03 ? Math.round(p * 100) : ""}</i>`; } grid += `</div>`; }
      grid += `<div class="r"><span class="lb"></span>${[0, 1, 2, 3, 4].map(j => `<span class="lb">${j}</span>`).join("")}</div>`; }
    const tops = pr ? pr.top.slice(0, 4).map(([i, j, p]) => { const f = hm ? i : j, g = hm ? j : i; return `<div><b>${f}-${g}</b><span>${pc(p)}</span></div>`; }).join("") : "";
    const outs = (window.DISCIPLINE && DISCIPLINE.decisions || []).filter(d => (d.out || []).some(x => x.date === m.date && x.home === m.home && x.away === m.away));
    const pend = (window.DISCIPLINE_PENDING || []).filter(p => (p.club === o || p.club === G.US) && p.match.date < m.date &&
      !G.LM.some(x => x.status === "played" && x.date > p.match.date && x.date < m.date && (x.home === p.club || x.away === p.club)));
    const abs = outs.map(d => `<li><b>${esc(d.person)}</b> · ${esc(d.club)} <small>موقوف بقرار ${esc(d.no)}</small></li>`).concat(pend.map(p => `<li><b>${esc(p.person)}</b> · ${esc(p.club)} <small>إيقاف تلقائي، لم يصدر قرار رسمي</small></li>`)).join("");
    const v = m.venue || "", km = !hm && G.ll(v) && G.BASE.ll ? Math.round(hav(G.BASE.ll, G.ll(v))) : null, wx = m.weather;
    let still = null; try { still = W.__render3D && W.__render3D(v, 900, 420, 0.6); } catch (e) {}
    const stand = pr ? `النموذج يعطي ${esc(G.US)} فرصة ${pc(us[0])} للفوز، والنتيجة الأرجح <bdi dir="ltr">${hm ? pr.top[0][0] + "-" + pr.top[0][1] : pr.top[0][1] + "-" + pr.top[0][0]}</bdi>.` : "";
    return frame(G, "match", `${opener(CH[1], stand)}
      <div class="dz-vs"><div>${G.img(m.home, "lg")}<b>${esc(m.home)}</b><small>${esc(G.tn(m.home))}</small></div>
        <div class="c"><span>${m.comp === "cup" ? "كأس الملك" : "الجولة " + m.round}</span><b>${esc(m.time || "--:--")}</b><span>${dAL(m.date)}</span></div>
        <div>${G.img(m.away, "lg")}<b>${esc(m.away)}</b><small>${esc(G.tn(m.away))}</small></div></div>
      <div class="dz-vsm"><span>${esc(v.replace(/\s*\(.*\)$/, ""))}</span><span>${esc(G.cityOf(v))}</span>${wx ? `<span>${wx.t}° ${WXA[wx.c] || ""}</span>` : ""}${km ? `<span>${n0(km)} كم من ${esc(G.BASE.ar || "")}</span>` : `<span>في أرضنا</span>`}</div>
      ${pr ? `${H("التوقع", "MODEL PREDICTION", "من نموذج إحصائي مبني على نتائج الدوري، مو نتيجة أكيدة")}
      <div class="dz-pr"><div><div class="dz-pbar">${[0, 1, 2].map(i => `<i style="flex:${us[i]};background:${[C.W, C.D, C.L][i]}">${us[i] >= .08 ? pc(us[i]) : ""}</i>`).join("")}</div>
        <div class="dz-pk"><span>فوز ${esc(G.US)} ${pc(us[0])}</span><span>تعادل ${pc(us[1])}</span><span>فوز ${esc(o)} ${pc(us[2])}</span></div>
        <div class="dz-xg"><div><b>${(hm ? pr.lh : pr.la).toFixed(1)}</b><span>أهداف متوقعة لنا</span></div><div><b>${(hm ? pr.la : pr.lh).toFixed(1)}</b><span>أهداف متوقعة لهم</span></div></div>
        <div class="dz-tops"><small>أرجح النتائج</small>${tops}</div></div>
        <div class="dz-grid"><small>احتمال كل نتيجة (%) · أهدافنا عمودياً وأهدافهم أفقياً</small>${grid}</div></div>` : ""}
      <div class="dz-2"><div>${H("المقارنة", "TALE OF THE TAPE")}<div class="dz-tph"><span>${esc(G.US)}</span><span>${esc(o)}</span></div>${tapeH}
          <div class="dz-fm"><div><small>آخر 5 لنا</small>${form(G.US)}</div><div><small>آخر 5 لهم</small>${form(o)}</div></div></div>
        <div>${still ? `<div class="dz-still"><img src="${still.src}" alt=""><span>${esc(v.replace(/\s*\(.*\)$/, ""))}</span></div>` : ""}
          ${H("الغيابات المعروفة", "KNOWN ABSENCES")}${abs ? `<ul class="dz-abs">${abs}</ul>` : `<p class="dz-mute">ما فيه موقوفين معروفين من سجل الانضباط.</p>`}</div></div>`);
  }

  /* ---------- 03 the race ---------- */
  function chRace(G, sim) {
    if (!sim) return frame(G, "race", opener(CH[2]));
    const R = sim.rows, mx = Math.max(...R.map(r => r.hi)) + 2, mn = Math.min(...R.map(r => r.now)) - 1, X = v => ((v - mn) / (mx - mn) * 100).toFixed(2);
    const ticks = []; for (let v = Math.ceil(mn / 10) * 10; v <= mx; v += 10) ticks.push(v);
    const rows = R.map((r, i) => `<div class="dz-rr${r.t === G.US ? " me" : ""}${i === G.PD.direct - 1 ? " cut2" : ""}${i === G.PD.playoff[1] - 1 ? " cut6" : ""}">
      <span class="p">${i + 1}</span>${G.img(r.t, "lg")}<span class="t">${esc(r.t)}</span><span class="n">${r.now}</span>
      <div class="bar">${ticks.map(v => `<u style="left:${X(v)}%"></u>`).join("")}<i class="now" style="left:0;width:${X(r.now)}%"></i><i class="rng" style="left:${X(r.lo)}%;width:${(X(r.hi) - X(r.lo))}%"></i><i class="mid" style="left:${X(r.mid)}%"></i></div>
      <span class="m">${r.mid}</span><span class="pp ${r.top2 >= .5 ? "hi" : ""}">${r.top2 < .005 ? "—" : pc(r.top2)}</span><span class="pp">${r.top6 < .005 ? "—" : pc(r.top6)}</span></div>`).join("");
    const me = R.find(r => r.t === G.US) || {};
    const stand = `لعبنا باقي الموسم ${n0(sim.N)} مرة بالنموذج، مع هامش لعدم اليقين في مستوى كل فريق: ${esc(G.US)} تصعد مباشرة في ${pc(me.top2)} منها، وتنهي الموسم عند ${me.mid} نقطة تقريباً.`;
    // attack vs defence
    const L = standings(G), Wd = 100, Hh = 70, ax = L.map(r => r.gf / Math.max(1, r.p)), dy = L.map(r => r.ga / Math.max(1, r.p));
    const x0 = Math.min(...ax) - .15, x1 = Math.max(...ax) + .15, y0 = Math.min(...dy) - .15, y1 = Math.max(...dy) + .15;
    const SX = v => 6 + (v - x0) / (x1 - x0) * (Wd - 12), SY = v => 6 + (v - y0) / (y1 - y0) * (Hh - 12);
    const avx = ax.reduce((s, v) => s + v, 0) / ax.length, avy = dy.reduce((s, v) => s + v, 0) / dy.length;
    const sc = `<svg viewBox="0 0 ${Wd} ${Hh}" class="dz-sc" style="direction:ltr"><rect width="${Wd}" height="${Hh}" fill="${C.soft}" rx="2"/><rect x="${SX(avx)}" y="0" width="${Wd - SX(avx)}" height="${SY(avy)}" fill="${C.W}" opacity=".08"/>
      <line x1="${SX(avx)}" x2="${SX(avx)}" y1="0" y2="${Hh}" stroke="${C.line}" stroke-width=".3" stroke-dasharray="1 1"/><line y1="${SY(avy)}" y2="${SY(avy)}" x1="0" x2="${Wd}" stroke="${C.line}" stroke-width=".3" stroke-dasharray="1 1"/>
      <text x="${Wd - 2}" y="4" font-size="2.6" fill="${C.W}" text-anchor="end">يسجل كثير ويستقبل قليل</text><text x="2" y="${Hh - 2}" font-size="2.6" fill="${C.L}">يسجل قليل ويستقبل كثير</text>
      ${L.map((r, i) => `<image href="${esc(G.logo(r.t))}" x="${SX(ax[i]) - 3}" y="${SY(dy[i]) - 3}" width="6" height="6"/>${r.t === G.US ? `<circle cx="${SX(ax[i])}" cy="${SY(dy[i])}" r="4.6" fill="none" stroke="${C.rock}" stroke-width=".7"/>` : ""}`).join("")}</svg>`;
    // remaining schedule
    const top = R.slice(0, 8).map(r => ({ t: r.t, s: sim.sos[r.t] })).filter(x => x.s && x.s.n);
    const smx = Math.max(...top.map(x => x.s.ppg), .1), smn = Math.min(...top.map(x => x.s.ppg)) * .9;
    const sos = top.sort((a, b) => b.s.ppg - a.s.ppg).map(x => `<div class="dz-so${x.t === G.US ? " me" : ""}">${G.img(x.t, "lg")}<span>${esc(x.t)}</span><div><i style="width:${(x.s.ppg - smn) / (smx - smn) * 100}%"></i></div><b>${x.s.ppg.toFixed(2)}</b><small>${x.s.n} م</small></div>`).join("");
    return frame(G, "race", `${opener(CH[2], stand)}
      ${H("الجدول المتوقع في نهاية الموسم", "PROJECTED FINAL TABLE", `${sim.left} مباراة متبقية · ${n0(sim.N)} محاكاة`)}
      <div class="dz-rh"><span></span><span></span><span>النادي</span><span>الآن</span><span>النقاط: الحالية، والمدى المتوقع (80% من المحاكاة)، والنقطة الأرجح</span><span>متوقع</span><span>أول 2</span><span>أول 6</span></div>
      <div class="dz-race">${rows}</div>
      <div class="dz-2"><div>${H("الهجوم مقابل الدفاع", "ATTACK AGAINST DEFENCE", "يمين أكثر = يسجل أكثر · فوق = يستقبل أقل")}${sc}</div>
        <div>${H("صعوبة ما تبقى", "WHAT IS LEFT", "متوسط نقاط الخصوم المتبقين في المباراة، للثمانية الأوائل. الأعلى = جدول أصعب")}<div class="dz-sos">${sos}</div></div></div>`);
  }

  /* ---------- 04 on the road ---------- */
  function chRoad(G) {
    const trips = G.mine.filter(m => m.away === G.US && m.status !== "expected"), tv = travel(G);
    const rows = trips.map(m => { const v = m.venue || G.homeOf(m.home), km = G.BASE.ll && G.ll(v) ? Math.round(hav(G.BASE.ll, G.ll(v))) : null, r = m.status === "played" && m.score ? G.res(m) : null;
      const [f, g] = r ? G.fa(m) : [null, null];
      return `<div class="dz-tr${r ? "" : " up"}${G.next && m.id === G.next.id ? " nx" : ""}"><span class="d">${m.date ? dE(m.date).toUpperCase() : "TBC"}</span><span class="c">${esc(G.cityOf(v) || (G.ven(v) || [])[6] || "")}</span>${G.img(m.home, "lg")}<span class="o">${esc(m.home)}</span>
        <span class="k">${km != null ? n0(km) + " كم" : "—"}</span><span class="s"${r ? ` style="color:${C[r]}"` : ""}>${r ? `${{ W: "فوز", D: "تعادل", L: "خسارة" }[r]} ${f}-${g}` : G.next && m.id === G.next.id ? "الرحلة الجاية" : "مجدولة"}</span></div>`; }).join("");
    const lt = G.teams.map(t => ({ t, ...tv[t] })).sort((a, b) => b.all - a.all), lmx = Math.max(...lt.map(x => x.all), 1);
    const race = lt.map(x => `<div class="dz-km${x.t === G.US ? " me" : ""}">${G.img(x.t, "lg")}<span>${esc(x.t)}</span><div><i class="a" style="width:${x.all / lmx * 100}%"></i><i class="d" style="width:${x.done / lmx * 100}%"></i></div><b>${n0(x.all / 1000 * 10) / 10}k</b></div>`).join("");
    const me = tv[G.US] || { done: 0, all: 0 }, rk = lt.findIndex(x => x.t === G.US) + 1;
    const stills = trips.filter(m => m.status !== "played").slice(0, 3).map(m => { const v = m.venue || G.homeOf(m.home); let s = null; try { s = W.__render3D && W.__render3D(v, 600, 340, 0.5); } catch (e) {}
      return s ? `<figure><img src="${s.src}" alt=""><figcaption><b>${esc(v.replace(/\s*\(.*\)$/, ""))}</b><span>${esc(m.home)} · ${m.date ? dA(m.date) : ""}</span></figcaption></figure>` : ""; }).join("");
    const stand = `${esc(G.US)} قطعت ${n0(me.done)} كم ذهاباً وعودة حتى الآن، ومجموع سفرها في الموسم ${n0(me.all)} كم، الـ${rk} بين أندية الدوري.`;
    return frame(G, "road", `${opener(CH[3], stand)}
      ${H("رحلاتنا خارج الأرض", "OUR AWAY TRIPS", "المسافة من " + esc(G.BASE.ar || "") + " إلى الملعب، بخط مستقيم")}<div class="dz-trs">${rows}</div>
      <div class="dz-2 w">${stills ? `<div>${H("ملاعب الرحلات الجاية", "WHERE WE GO NEXT")}<div class="dz-stills">${stills}</div></div>` : ""}
        <div>${H("سباق الكيلومترات", "AWAY KILOMETRES, EVERY CLUB", "الغامق ما انقطع، والفاتح مجموع الموسم المعلن")}<div class="dz-kms">${race}</div></div></div>`);
  }

  /* ---------- 05 discipline ---------- */
  function chDiscipline(G) {
    const D = (window.DISCIPLINE && DISCIPLINE.decisions) || [], mine = D.filter(d => d.club === G.US), pend = (window.DISCIPLINE_PENDING || []);
    const byC = {}; G.teams.forEach(t => byC[t] = { t, n: 0, ban: 0, fine: 0, red: 0 });
    D.forEach(d => { const c = byC[d.club]; if (!c) return; c.n++; c.ban += +d.ban || 0; c.fine += +d.fine || 0; if (/حمراء|طرد/.test(d.reason || "")) c.red++; });
    pend.forEach(p => { const c = byC[p.club]; if (c) { c.red++; c.n++; } });
    const lt = Object.values(byC).sort((a, b) => b.n - a.n || b.fine - a.fine), mx = Math.max(...lt.map(x => x.n), 1);
    const tbl = lt.map((x, i) => `<div class="dz-dr${x.t === G.US ? " me" : ""}"><span class="p">${i + 1}</span>${G.img(x.t, "lg")}<span class="t">${esc(x.t)}</span><div><i style="width:${x.n / mx * 100}%"></i></div><b>${x.n}</b><span class="f">${x.fine ? n0(x.fine) : "—"}</span></div>`).join("");
    const cards = mine.map(d => `<div class="dz-dc"><b>${esc(d.person)}</b><span>${esc(d.role || "")}</span><p>${esc(d.reason || "")}</p><small>${d.ban ? `إيقاف ${d.ban} ${d.ban === 1 ? "مباراة" : "مباريات"}` : ""}${d.fine ? ` · غرامة ${n0(d.fine)} ريال` : ""} · قرار ${esc(d.no)}</small></div>`).join("");
    const pnd = pend.map(p => `<li><b>${esc(p.person)}</b> · ${esc(p.club)} · ${esc(p.match.home)} × ${esc(p.match.away)} · ${dA(p.match.date)}</li>`).join("");
    const me = byC[G.US] || { n: 0 }, rk = lt.findIndex(x => x.t === G.US) + 1;
    const stand = mine.length ? `${mine.length} ${mine.length === 1 ? "قرار" : "قرارات"} انضباطية على ${esc(G.US)} هذا الموسم، والترتيب ${rk} بين الأندية في عدد القرارات.` : `ما صدر على ${esc(G.US)} أي قرار انضباطي هذا الموسم، من أنظف أندية الدوري.`;
    return frame(G, "discipline", `${opener(CH[4], stand)}
      <div class="dz-2 w"><div>${H("قراراتنا", "OUR DECISIONS", "من لجنة الانضباط والأخلاق")}${cards ? `<div class="dz-dcs">${cards}</div>` : `<div class="dz-clean"><b>0</b><span>سجل نظيف</span></div>`}
          ${H("آخر قرارات اللجنة في الدوري", "LATEST DECISIONS, ALL CLUBS")}<div class="dz-lat">${D.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 6).map(d => `<div>${G.img(d.club, "lg")}<span><b>${esc(d.person)}</b> · ${esc(d.club)}<small>${d.ban ? `إيقاف ${d.ban} ${d.ban === 1 ? "مباراة" : "مباريات"}` : "غرامة"}${d.fine ? ` · ${n0(d.fine)} ريال` : ""} · ${dA(d.date)}</small></span></div>`).join("")}</div>
          ${pnd ? `${H("طرد بلا قرار منشور", "AWAITING A DECISION", "حالات في الدوري ما نشرت فيها اللجنة قراراً حتى الآن")}<ul class="dz-abs">${pnd}</ul>` : ""}</div>
        <div>${H("جدول الانضباط", "DISCIPLINE TABLE", "عدد القرارات وحالات الطرد بلا قرار، والغرامات بالريال")}<div class="dz-dh"><span></span><span></span><span>النادي</span><span></span><span>قرارات</span><span>غرامات</span></div><div class="dz-dt">${tbl}</div></div></div>`);
  }

  /* ---------- 06 fixture changes ---------- */
  function chChanges(G) {
    const FL = { date: "الموعد", venue: "الملعب", time: "الوقت", status: "الحالة", round: "الجولة", home: "الأرض" };
    const ms = G.mine.filter(m => m.changes && m.changes.length);
    const items = ms.map(m => `<div class="dz-cg"><div class="h">${G.img(G.opp(m), "lg")}<b>${esc(m.home)} × ${esc(m.away)}</b><span>${m.comp === "cup" ? "كأس الملك" : "الجولة " + m.round}${m.date ? " · " + dA(m.date) : ""}</span></div>
      ${m.changes.map(c => `<div class="c"><span class="f">${FL[c.field] || esc(c.field)}</span><s>${esc((c.from || [])[1] || (c.from || [])[0] || "")}</s><i>←</i><b>${esc((c.to || [])[1] || (c.to || [])[0] || "")}</b></div>`).join("")}</div>`).join("");
    const cnt = {}; ms.forEach(m => m.changes.forEach(c => cnt[c.field] = (cnt[c.field] || 0) + 1));
    const tot = Object.values(cnt).reduce((s, v) => s + v, 0);
    const stand = `${tot} ${tot === 1 ? "تعديل" : "تعديلات"} على ${ms.length} من مبارياتنا منذ نشر الجدول: ${Object.entries(cnt).map(([k, v]) => `${v} ${FL[k] || k}`).join("، ")}.`;
    return frame(G, "changes", `${opener(CH[5], stand)}
      <div class="dz-cgk">${Object.entries(cnt).map(([k, v]) => `<div><b>${v}</b><span>${FL[k] || k}</span></div>`).join("")}</div>
      <div class="dz-cgs">${items || `<p class="dz-mute">ما فيه تعديلات.</p>`}</div>`);
  }

  /* ---------- back page ---------- */
  function back(G, sim) {
    PG++;
    return `<section class="rps fix dz dz-back"><div class="dz-bk">
      <div class="dz-kick">METHOD AND SOURCES</div><h2>من وين الأرقام</h2>
      <div class="dz-bkg"><div><b>النتائج والجدول</b><p>من موقع الاتحاد السعودي لكرة القدم، وتتحدث تلقائياً بعد كل مباراة.</p></div>
        <div><b>التوقعات</b><p>نموذج ديكسون-كولز: لكل فريق قوة هجوم ودفاع من نتائج الدوري هذا الموسم، والمباريات الأحدث لها وزن أكبر، وأفضلية الأرض محسوبة من الدوري نفسه. جدول نهاية الموسم من ${sim ? n0(sim.N) : "آلاف"} محاكاة لباقي المباريات. ما يدخل فيه: الإصابات والإيقافات والتشكيلة.</p></div>
        <div><b>الانضباط</b><p>قرارات لجنة الانضباط والأخلاق المنشورة في موقع الاتحاد، وحالات الطرد اللي ما صدر فيها قرار من تقارير المباريات الصحفية.</p></div>
        <div><b>المسافات</b><p>بخط مستقيم بين ملعب الفريق والملعب المضيف، ذهاباً وعودة. الأوقات في بطاقات السفر تقريبية.</p></div></div>
      <div class="dz-bkc">${G.img(G.US)}<div><b>مركز مباريات دوري الأولى</b><span>${esc(G.author)}</span><small>${dAL(today())}</small></div></div></div></section>`;
  }

  /* ---------- build ---------- */
  function build(which) {
    const G = ctx(); let sim = null; try { sim = simulate(G, 2000); } catch (e) { console.error(e); }
    const only = which && which !== "all" ? which : null;
    const parts = only ? [only] : CH.map(c => c.k);
    TOTAL = parts.length + (only ? 0 : 3); PG = 0;
    const pages = {}; let p = only ? 0 : 2; parts.forEach(k => pages[k] = ++p);
    const fn = { season: () => chSeason(G), match: () => chMatch(G), race: () => chRace(G, sim), road: () => chRoad(G), discipline: () => chDiscipline(G), changes: () => chChanges(G) };
    let h = STYLE;
    if (!only) { h += cover(G, sim); h += contents(G, sim, pages); }
    parts.forEach(k => { try { h += fn[k](); } catch (e) { console.error(k, e); PG++; h += `<section class="rps fix dz"><p style="padding:20mm">تعذر بناء هذا الفصل: ${esc(e.message)}</p></section>`; } });
    if (!only) h += back(G, sim);
    return h;
  }

  const STYLE = `<style>
#rpOv .dz{background:${C.paper};color:${C.ink};font-family:var(--ar);direction:rtl;display:flex;flex-direction:column;padding:0;position:relative}
#rpOv .dz *{box-sizing:border-box}
#rpOv .dz img.lg,#rpOv .dz .nolg{width:6mm;height:6mm;object-fit:contain;flex:none;display:inline-block}
#rpOv .dz-kick{font-family:var(--dinc);letter-spacing:.24em;font-size:8px;color:${C.rock};direction:ltr;text-align:right}
/* edge tabs, like a binder */
#rpOv .dz-tabs{position:absolute;left:0;top:30mm;display:flex;flex-direction:column;gap:1.2mm;z-index:2}
#rpOv .dz-tabs span{display:flex;align-items:center;gap:1.5mm;height:17mm;width:6mm;background:${C.bone};border-radius:0 2mm 2mm 0;color:${C.mute};font-family:var(--dinc);font-size:9px;justify-content:center;writing-mode:vertical-rl;transform:rotate(180deg)}
#rpOv .dz-tabs span.on{width:8mm;height:34mm;background:${C.ink};color:${C.paper}}
#rpOv .dz-tabs span.on i{font-style:normal;font-family:var(--ar);font-size:8.5px;font-weight:700;color:${C.sand}}
/* running head and foot */
#rpOv .dz-run{display:flex;justify-content:space-between;align-items:center;padding:8mm 12mm 3mm 14mm;border-bottom:.3mm solid ${C.ink};margin:0 0 0 0}
#rpOv .dz-run span{display:flex;align-items:center;gap:2mm}
#rpOv .dz-run b{font-size:10px;font-weight:800}
#rpOv .dz-run em{font-style:normal;font-family:var(--dinc);letter-spacing:.2em;font-size:7.5px;color:${C.mute}}
#rpOv .dz-run img.cr{width:6mm;height:6mm;object-fit:contain}
#rpOv .dz-body{flex:1;padding:5mm 12mm 0 16mm;display:flex;flex-direction:column;gap:3.4mm;min-height:0;overflow:hidden}
#rpOv .dz-foot{display:flex;justify-content:space-between;align-items:flex-end;padding:3mm 12mm 6mm 16mm;font-size:7.5px;color:${C.mute};gap:4mm;border-top:.2mm solid ${C.line}}
#rpOv .dz-foot b{font-family:var(--dinc);font-size:16px;color:${C.ink};line-height:1;direction:ltr}
#rpOv .dz-foot b small{font-size:9px;color:${C.mute}}
/* chapter opener */
#rpOv .dz-op{display:grid;grid-template-columns:auto 1fr;gap:5mm;align-items:center;padding:1mm 0 1mm}
#rpOv .dz-num{font-family:var(--dinc);font-size:88px;line-height:.78;font-weight:800;color:transparent;-webkit-text-stroke:1.1px ${C.ink};direction:ltr}
#rpOv .dz-op h1{margin:.5mm 0 0;font-size:30px;font-weight:800;line-height:1.1;color:${C.ink}}
#rpOv .dz-op p{margin:1.5mm 0 0;font-size:11px;line-height:1.55;color:${C.ink2};max-width:150mm}
#rpOv .dz-h{display:flex;align-items:baseline;gap:2.4mm;border-bottom:.25mm solid ${C.line};padding-bottom:1.2mm;flex-wrap:wrap}
#rpOv .dz-h b{font-size:12px;font-weight:800}
#rpOv .dz-h span{font-family:var(--dinc);font-size:7.5px;letter-spacing:.2em;color:${C.rock};direction:ltr}
#rpOv .dz-h small{margin-inline-start:auto;font-size:8px;color:${C.mute}}
#rpOv .dz-2{display:grid;grid-template-columns:1fr 1fr;gap:6mm;min-height:0}
#rpOv .dz-2>div{display:flex;flex-direction:column;gap:2.4mm;min-width:0}
#rpOv .dz-2.w{grid-template-columns:1.05fr 1fr}
#rpOv .dz-mute{color:${C.mute};font-size:10px;margin:0}
#rpOv .dz-abs{margin:0;padding:0 4mm 0 0;font-size:9.5px;line-height:1.6}#rpOv .dz-abs small{color:${C.mute}}
/* cover */
#rpOv .dz-cover{background:${C.ink};color:${C.paper};padding:12mm 14mm 10mm}
#rpOv .dz-cv-top,#rpOv .dz-cv-f{display:flex;justify-content:space-between;font-family:var(--dinc);letter-spacing:.2em;font-size:8px;color:rgba(244,239,230,.55)}
#rpOv .dz-cv-f{font-family:var(--ar);letter-spacing:0;font-size:9px}
#rpOv .dz-cv-t{margin-top:12mm}
#rpOv .dz-cv-k{font-family:var(--dinc);letter-spacing:.42em;font-size:11px;color:${C.sand};direction:ltr;text-align:right}
#rpOv .dz-cover h1{margin:2mm 0 0;font-size:64px;line-height:1;font-weight:800}
#rpOv .dz-cv-c{font-size:20px;font-weight:700;margin-top:2mm;color:${C.sand}}#rpOv .dz-cv-c span{font-family:var(--dinc);letter-spacing:.1em;color:rgba(244,239,230,.6);font-size:16px}
#rpOv .dz-fp{position:relative;width:150mm;height:150mm;margin:0 auto}
#rpOv .dz-fp svg{width:100%;height:100%;overflow:visible}
#rpOv .dz-fpc{position:absolute;left:50%;top:50%;width:30mm;height:30mm;transform:translate(-50%,-50%);display:grid;place-items:center}
#rpOv .dz-fpc img{width:100%;height:100%;object-fit:contain}
#rpOv .dz-cv-key{display:flex;flex-wrap:wrap;gap:2mm 5mm;font-size:9px;color:rgba(244,239,230,.75);align-items:center}
#rpOv .dz-cv-key i{display:inline-block;width:5mm;height:1.3mm;border-radius:1mm;margin-inline-end:1.4mm;vertical-align:middle}#rpOv .dz-cv-key i.sd{background:${C.sand}}
#rpOv .dz-cv-key em{font-style:normal;width:100%;font-size:8.5px;color:rgba(244,239,230,.5)}
#rpOv .dz-cv-big{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:auto 0 6mm;border-top:.3mm solid rgba(244,239,230,.25);padding-top:4mm}
#rpOv .dz-cv-big b{display:block;font-family:var(--dinc);font-size:34px;line-height:1;color:${C.paper};direction:ltr;text-align:right}
#rpOv .dz-cv-big span{display:block;font-size:10px;font-weight:700;margin-top:1mm}#rpOv .dz-cv-big small{font-family:var(--dinc);letter-spacing:.18em;font-size:7px;color:rgba(244,239,230,.45)}
/* contents */
#rpOv .dz-toc-g{display:grid;grid-template-columns:1fr 1.1fr;gap:9mm;margin-top:4mm}
#rpOv .dz-toc h2,#rpOv .dz-back h2{margin:1mm 0 3mm;font-size:26px;font-weight:800}
#rpOv .dz-toc ol{list-style:none;margin:0;padding:0}
#rpOv .dz-toc li{display:grid;grid-template-columns:12mm 1fr auto;align-items:center;border-bottom:.25mm solid ${C.line};padding:2.6mm 0}
#rpOv .dz-toc li b{font-family:var(--dinc);font-size:22px;color:${C.rock}}
#rpOv .dz-toc li span{font-size:13px;font-weight:700}#rpOv .dz-toc li small{display:block;font-family:var(--dinc);letter-spacing:.16em;font-size:7.5px;color:${C.mute};font-weight:400}
#rpOv .dz-toc li i{font-style:normal;font-family:var(--dinc);font-size:13px;color:${C.mute}}
#rpOv .dz-hl p{display:grid;grid-template-columns:9mm 1fr;margin:0 0 3.2mm;font-size:12.5px;line-height:1.55;font-weight:700}
#rpOv .dz-hl p b{font-family:var(--dinc);color:${C.sand};font-size:15px}
#rpOv .dz-hl p small{display:block;font-family:var(--dinc);font-size:8px;letter-spacing:.06em;color:${C.mute};font-weight:400;direction:ltr;text-align:right}
#rpOv .dz-six{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:.3mm solid ${C.ink}}
#rpOv .dz-six div{padding:5mm 4mm 5mm 0;border-bottom:.25mm solid ${C.line}}
#rpOv .dz-six div:not(:nth-child(3n)){border-left:.25mm solid ${C.line}}
#rpOv .dz-six b{display:block;font-family:var(--dinc);font-size:48px;line-height:1;direction:ltr;text-align:right}
#rpOv .dz-six span{display:block;font-size:11px;font-weight:700;margin-top:1mm}#rpOv .dz-six small{font-family:var(--dinc);letter-spacing:.18em;font-size:7px;color:${C.mute}}
#rpOv .dz-n5{display:grid;grid-template-columns:repeat(5,1fr);gap:2.4mm}#rpOv .dz-n5>div{background:#fff;border-radius:2mm;padding:3mm 2.4mm;display:flex;flex-direction:column;align-items:center;gap:.8mm;text-align:center}#rpOv .dz-n5 img.lg{width:10mm;height:10mm}#rpOv .dz-n5 b{font-size:10px}#rpOv .dz-n5 span{font-size:7.5px;color:${C.mute}}#rpOv .dz-n5 em{display:block;width:100%;height:2mm;background:${C.soft};border-radius:1mm;direction:ltr}#rpOv .dz-n5 em i{display:block;height:100%;background:${C.W};border-radius:1mm}#rpOv .dz-n5 strong{font-family:var(--dinc);font-size:16px}
#rpOv .dz-how{margin-top:auto;margin-bottom:6mm;background:${C.bone};border-radius:2mm;padding:4mm 5mm;font-size:9.5px;line-height:1.7;color:${C.ink2}}
#rpOv .dz-how b{display:block;font-size:11px;color:${C.ink};margin-bottom:.5mm}
/* season */
#rpOv .dz-path{width:100%;height:auto;display:block}
#rpOv .dz-stubs{display:grid;grid-template-columns:repeat(7,1fr);gap:1.6mm}
#rpOv .dz-stub{background:#fff;border-radius:1.6mm;padding:1.6mm 1mm 1.4mm;text-align:center;border-top:1.2mm solid;position:relative;display:flex;flex-direction:column;align-items:center;gap:.4mm}
#rpOv .dz-stub.W{border-color:${C.W}}#rpOv .dz-stub.D{border-color:${C.D}}#rpOv .dz-stub.L{border-color:${C.L}}
#rpOv .dz-stub .w{font-size:7px;color:${C.mute}}
#rpOv .dz-stub b{font-family:var(--dinc);font-size:15px;line-height:1;direction:ltr}#rpOv .dz-stub b i{font-style:normal;color:${C.mute};margin:0 .6mm}
#rpOv .dz-stub .o{font-size:7.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#rpOv .dz-stub small{font-size:6.5px;color:${C.mute}}
#rpOv .dz-sps{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
#rpOv .dz-sp{background:#fff;border-radius:2mm;padding:3mm}
#rpOv .dz-sp .h b{font-size:11px}#rpOv .dz-sp .h span{font-family:var(--dinc);font-size:7px;letter-spacing:.18em;color:${C.mute};margin-inline-start:1.5mm}
#rpOv .dz-sp .n b{font-family:var(--dinc);font-size:30px;line-height:1.1;display:block;direction:ltr;text-align:right}#rpOv .dz-sp .n span{font-size:8px;color:${C.mute}}
#rpOv .dz-wdl{display:flex;height:4.5mm;border-radius:1mm;overflow:hidden;margin:2mm 0 1.6mm}
#rpOv .dz-wdl i{font-style:normal;color:#fff;font-family:var(--dinc);font-size:9px;display:grid;place-items:center}
#rpOv .dz-sp .g{display:flex;justify-content:space-between;font-size:8px;color:${C.mute}}#rpOv .dz-sp .g b{color:${C.ink};font-family:var(--dinc);font-size:11px}
#rpOv .dz-gbs{display:flex;align-items:flex-end;justify-content:space-between;gap:1mm;height:42mm;border-bottom:.25mm solid ${C.ink};padding:0 1mm;direction:ltr}
#rpOv .dz-gb{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:.4mm;position:relative}
#rpOv .dz-gb i{width:70%;max-width:6mm;border-radius:.6mm}
#rpOv .dz-gb i.f{background:${C.W}}#rpOv .dz-gb i.a{background:${C.L}}
#rpOv .dz-gb span{position:absolute;bottom:-4mm;font-size:7px;color:${C.mute}}
#rpOv .dz-rec{display:grid;grid-template-columns:repeat(4,1fr);gap:2.4mm}#rpOv .dz-rec div{border-top:1mm solid ${C.ink};padding-top:2mm}#rpOv .dz-rec b{font-family:var(--dinc);font-size:30px;line-height:1;display:block;direction:ltr;text-align:right}#rpOv .dz-rec span{display:block;font-size:10px;font-weight:800;margin-top:1mm}#rpOv .dz-rec small{font-size:8px;color:${C.mute}}
/* match */
#rpOv .dz-vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;background:${C.ink};color:${C.paper};border-radius:3mm;padding:5mm 6mm;gap:4mm}
#rpOv .dz-vs>div{display:flex;flex-direction:column;align-items:center;gap:1mm;text-align:center}
#rpOv .dz-vs img.lg{width:20mm;height:20mm}#rpOv .dz-vs>div>b{font-size:16px}#rpOv .dz-vs>div>small{font-family:var(--dinc);letter-spacing:.14em;font-size:8px;color:rgba(244,239,230,.55)}
#rpOv .dz-vs .c b{font-family:var(--dinc);font-size:44px;line-height:1;color:${C.sand};direction:ltr}#rpOv .dz-vs .c span{font-size:9.5px;color:rgba(244,239,230,.75)}
#rpOv .dz-vsm{display:flex;flex-wrap:wrap;gap:1.5mm 6mm;font-size:9.5px;color:${C.ink2};justify-content:center}
#rpOv .dz-vsm span+span::before{content:"•";margin-inline-end:6mm;color:${C.sand}}
#rpOv .dz-pr{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
#rpOv .dz-pbar{display:flex;height:10mm;border-radius:2mm;overflow:hidden}
#rpOv .dz-pbar i{font-style:normal;display:grid;place-items:center;color:#fff;font-family:var(--dinc);font-size:14px;min-width:0;overflow:hidden}
#rpOv .dz-pk{display:flex;justify-content:space-between;font-size:8.5px;color:${C.mute};margin-top:1mm}
#rpOv .dz-xg{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}
#rpOv .dz-xg div{background:#fff;border-radius:2mm;padding:2.4mm 3mm}#rpOv .dz-xg b{font-family:var(--dinc);font-size:26px;display:block;line-height:1;direction:ltr;text-align:right}#rpOv .dz-xg span{font-size:8.5px;color:${C.mute}}
#rpOv .dz-tops{display:flex;gap:2mm;align-items:center;margin-top:3mm;flex-wrap:wrap}#rpOv .dz-tops small{font-size:8.5px;color:${C.mute};margin-inline-end:1mm}
#rpOv .dz-tops div{border:.3mm solid ${C.line};border-radius:1.6mm;padding:1mm 2.4mm;text-align:center}#rpOv .dz-tops b{font-family:var(--dinc);font-size:13px;display:block;direction:ltr}#rpOv .dz-tops span{font-size:7.5px;color:${C.mute}}
#rpOv .dz-grid small{display:block;font-size:7.5px;color:${C.mute};margin-bottom:1.4mm}
#rpOv .dz-grid .r{display:grid;grid-template-columns:5mm repeat(5,1fr);gap:.8mm;margin-bottom:.8mm;direction:ltr}
#rpOv .dz-grid .r i{font-style:normal;height:7mm;border-radius:1mm;display:grid;place-items:center;font-family:var(--dinc);font-size:9px;color:#fff}
#rpOv .dz-grid .lb{font-family:var(--dinc);font-size:8px;color:${C.mute};display:grid;place-items:center}
#rpOv .dz-tph{display:flex;justify-content:space-between;font-size:10px;font-weight:800}
#rpOv .dz-tp{display:grid;grid-template-columns:9mm 1fr 30mm 1fr 9mm;align-items:center;gap:1.4mm;font-size:8.5px;padding:.9mm 0;border-bottom:.2mm solid ${C.line}}
#rpOv .dz-tp b{font-family:var(--dinc);font-size:13px;text-align:center;color:${C.mute}}#rpOv .dz-tp b.win{color:${C.ink}}
#rpOv .dz-tp span{text-align:center;font-weight:700}#rpOv .dz-tp small{display:block;font-family:var(--dinc);font-size:6.5px;color:${C.mute};letter-spacing:.08em;font-weight:400}
#rpOv .dz-tp .l,#rpOv .dz-tp .r{height:2.4mm;background:${C.soft};border-radius:1mm;display:flex}
#rpOv .dz-tp .l{justify-content:flex-start}#rpOv .dz-tp .r{justify-content:flex-end}
#rpOv .dz-tp .l i{background:${C.rock};border-radius:1mm}#rpOv .dz-tp .r i{background:${C.ink2};border-radius:1mm}
#rpOv .dz-fm{display:flex;justify-content:space-between;margin-top:2mm}
#rpOv .dz-fm small{font-size:8px;color:${C.mute};margin-inline-end:1.4mm}
#rpOv .dz-fm i{font-style:normal;display:inline-grid;place-items:center;width:5mm;height:5mm;border-radius:1mm;color:#fff;font-size:8px;font-weight:800;margin-inline-start:.6mm}
#rpOv .dz-still{position:relative;border-radius:2.4mm;overflow:hidden;height:44mm}
#rpOv .dz-still img{width:100%;height:100%;object-fit:cover;display:block}
#rpOv .dz-still span{position:absolute;bottom:0;inset-inline:0;background:linear-gradient(transparent,rgba(20,32,46,.85));color:#fff;font-size:9px;padding:6mm 3mm 2mm;font-weight:700}
#rpOv .dz-empty{font-size:12px;color:${C.mute}}
/* race */
#rpOv .dz-rh,#rpOv .dz-rr{display:grid;grid-template-columns:5mm 6mm 26mm 8mm 1fr 8mm 11mm 11mm;align-items:center;gap:1.6mm}
#rpOv .dz-rh{font-size:7px;color:${C.mute};margin-bottom:-1mm}#rpOv .dz-rh span:nth-child(n+4){text-align:center}
#rpOv .dz-race{display:flex;flex-direction:column}
#rpOv .dz-rr{font-size:9px;padding:.85mm 0;border-bottom:.2mm solid ${C.line}}
#rpOv .dz-rr.me{background:${C.bone};border-radius:1mm}
#rpOv .dz-rr.cut2{border-bottom:.5mm solid ${C.W}}#rpOv .dz-rr.cut6{border-bottom:.5mm solid ${C.sand}}
#rpOv .dz-rr .p{font-family:var(--dinc);font-size:11px;text-align:center;color:${C.mute}}
#rpOv .dz-rr .t{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rpOv .dz-rr .n,#rpOv .dz-rr .m{font-family:var(--dinc);font-size:12px;text-align:center}#rpOv .dz-rr .m{font-weight:800}
#rpOv .dz-rr .bar{position:relative;height:4.4mm;direction:ltr}
#rpOv .dz-rr .bar u{position:absolute;top:0;bottom:0;width:.15mm;background:${C.line}}
#rpOv .dz-rr .bar .now{position:absolute;top:1.3mm;height:1.8mm;background:${C.ink};border-radius:1mm;opacity:.85}
#rpOv .dz-rr .bar .rng{position:absolute;top:.5mm;height:3.4mm;background:${C.sand};opacity:.45;border-radius:1.7mm}
#rpOv .dz-rr .bar .mid{position:absolute;top:0;width:.9mm;height:4.4mm;background:${C.rock};border-radius:.4mm;margin-left:-.45mm}
#rpOv .dz-rr .pp{font-family:var(--dinc);font-size:11px;text-align:center;color:${C.mute}}#rpOv .dz-rr .pp.hi{color:${C.W};font-weight:800}
#rpOv .dz-sc{width:100%;height:auto;display:block}
#rpOv .dz-sos{display:flex;flex-direction:column;gap:1.4mm}
#rpOv .dz-so{display:grid;grid-template-columns:6mm 22mm 1fr 9mm 7mm;gap:1.6mm;align-items:center;font-size:8.5px}
#rpOv .dz-so.me{font-weight:800}
#rpOv .dz-so div{height:3mm;background:${C.soft};border-radius:1.5mm;direction:ltr}#rpOv .dz-so div i{display:block;height:100%;background:${C.ink2};border-radius:1.5mm}
#rpOv .dz-so.me div i{background:${C.rock}}
#rpOv .dz-so b{font-family:var(--dinc);font-size:11px}#rpOv .dz-so small{font-size:7px;color:${C.mute}}
/* road */
#rpOv .dz-trs{display:flex;flex-direction:column;background:${C.ink};border-radius:2.4mm;padding:1.6mm 3mm;color:${C.paper}}
#rpOv .dz-tr{display:grid;grid-template-columns:14mm 26mm 6mm 1fr 18mm 22mm;gap:2mm;align-items:center;padding:1.05mm 0;border-bottom:.2mm solid rgba(244,239,230,.1);font-size:9.5px}
#rpOv .dz-tr:last-child{border:0}
#rpOv .dz-tr .d{font-family:var(--dinc);color:${C.sand};letter-spacing:.08em;direction:ltr;text-align:right}
#rpOv .dz-tr .c{font-weight:800}#rpOv .dz-tr .k{font-family:var(--dinc);color:rgba(244,239,230,.7)}
#rpOv .dz-tr .s{font-weight:800;text-align:left;font-size:9px}
#rpOv .dz-tr.up{opacity:.7}#rpOv .dz-tr.nx{opacity:1}#rpOv .dz-tr.nx .s{color:${C.sand}}
#rpOv .dz-stills{display:grid;gap:2.4mm}
#rpOv .dz-stills figure{margin:0;position:relative;border-radius:2mm;overflow:hidden;height:30mm}
#rpOv .dz-stills img{width:100%;height:100%;object-fit:cover;display:block}
#rpOv .dz-stills figcaption{position:absolute;inset-inline:0;bottom:0;background:linear-gradient(transparent,rgba(20,32,46,.88));color:#fff;padding:5mm 3mm 1.6mm;font-size:8.5px}
#rpOv .dz-stills figcaption b{display:block;font-size:9px}
#rpOv .dz-kms{display:flex;flex-direction:column;gap:.45mm}
#rpOv .dz-km{display:grid;grid-template-columns:5mm 20mm 1fr 10mm;gap:1.6mm;align-items:center;font-size:8px}#rpOv .dz-km img.lg,#rpOv .dz-km .nolg{width:4.6mm;height:4.6mm}
#rpOv .dz-km.me{font-weight:800}
#rpOv .dz-km div{position:relative;height:2.8mm;direction:ltr}
#rpOv .dz-km div i{position:absolute;left:0;top:0;bottom:0;border-radius:1.6mm}
#rpOv .dz-km i.a{background:${C.bone}}#rpOv .dz-km i.d{background:${C.ink2}}#rpOv .dz-km.me i.d{background:${C.rock}}
#rpOv .dz-km b{font-family:var(--dinc);font-size:10px}
/* discipline */
#rpOv .dz-dcs{display:flex;flex-direction:column;gap:2mm}
#rpOv .dz-dc{background:#fff;border-radius:2mm;padding:2.6mm 3mm;border-inline-start:1.2mm solid ${C.L}}
#rpOv .dz-dc b{font-size:11px}#rpOv .dz-dc span{font-size:8.5px;color:${C.mute};margin-inline-start:1.5mm}
#rpOv .dz-dc p{margin:1mm 0;font-size:9px;line-height:1.5}#rpOv .dz-dc small{font-size:8px;color:${C.rock};font-weight:700}
#rpOv .dz-clean{background:#fff;border-radius:2mm;padding:6mm;text-align:center}#rpOv .dz-clean b{font-family:var(--dinc);font-size:60px;color:${C.W};display:block;line-height:1}
#rpOv .dz-dh,#rpOv .dz-dr{display:grid;grid-template-columns:5mm 6mm 22mm 1fr 8mm 14mm;gap:1.6mm;align-items:center}
#rpOv .dz-dh{font-size:7px;color:${C.mute}}
#rpOv .dz-dt{display:flex;flex-direction:column}
#rpOv .dz-dr{font-size:8.5px;padding:.8mm 0;border-bottom:.2mm solid ${C.line}}#rpOv .dz-dr.me{background:${C.bone};font-weight:800}
#rpOv .dz-dr .p{font-family:var(--dinc);color:${C.mute};text-align:center}
#rpOv .dz-dr div{height:2.6mm;background:${C.soft};border-radius:1.3mm;direction:ltr}#rpOv .dz-dr div i{display:block;height:100%;background:${C.L};border-radius:1.3mm;opacity:.8}
#rpOv .dz-dr b{font-family:var(--dinc);font-size:11px;text-align:center}#rpOv .dz-dr .f{font-family:var(--dinc);font-size:9px;color:${C.mute};text-align:left}
#rpOv .dz-lat{display:flex;flex-direction:column;gap:1.4mm}#rpOv .dz-lat>div{display:flex;gap:2mm;align-items:center;background:#fff;border-radius:1.6mm;padding:1.6mm 2.4mm;font-size:9px}#rpOv .dz-lat small{display:block;font-size:7.5px;color:${C.mute}}
/* changes */
#rpOv .dz-cgk{display:flex;gap:4mm}
#rpOv .dz-cgk div{flex:1;background:${C.ink};color:${C.paper};border-radius:2mm;padding:3mm 4mm}#rpOv .dz-cgk b{font-family:var(--dinc);font-size:30px;line-height:1;display:block;color:${C.sand}}#rpOv .dz-cgk span{font-size:10px}
#rpOv .dz-cgs{display:grid;grid-template-columns:1fr 1fr;gap:2.4mm;align-content:start}
#rpOv .dz-cg{background:#fff;border-radius:2mm;padding:2.6mm 3mm;break-inside:avoid}
#rpOv .dz-cg .h{display:flex;align-items:center;gap:1.6mm;margin-bottom:1.4mm}#rpOv .dz-cg .h b{font-size:10px}#rpOv .dz-cg .h span{font-size:8px;color:${C.mute};margin-inline-start:auto}
#rpOv .dz-cg .c{display:grid;grid-template-columns:12mm 1fr 4mm 1fr;gap:1.2mm;align-items:start;font-size:8.5px;line-height:1.45;padding:.8mm 0;border-top:.2mm dashed ${C.line}}
#rpOv .dz-cg .c .f{font-weight:800;color:${C.rock}}#rpOv .dz-cg .c s{color:${C.mute}}#rpOv .dz-cg .c i{font-style:normal;color:${C.sand};text-align:center}
/* back */
#rpOv .dz-back{background:${C.ink};color:${C.paper}}
#rpOv .dz-bk{padding:24mm 16mm 14mm;display:flex;flex-direction:column;flex:1}
#rpOv .dz-bkg{display:grid;grid-template-columns:1fr 1fr;gap:7mm 10mm;margin-top:4mm}
#rpOv .dz-bkg b{display:block;font-size:13px;color:${C.sand};margin-bottom:1.4mm}#rpOv .dz-bkg p{margin:0;font-size:10px;line-height:1.75;color:rgba(244,239,230,.82)}
#rpOv .dz-bkc{margin-top:auto;display:flex;align-items:center;gap:5mm;border-top:.3mm solid rgba(244,239,230,.2);padding-top:6mm}
#rpOv .dz-bkc img{width:18mm;height:18mm;object-fit:contain}#rpOv .dz-bkc b{display:block;font-size:13px}#rpOv .dz-bkc span{display:block;font-size:10px;color:${C.sand}}#rpOv .dz-bkc small{font-size:9px;color:rgba(244,239,230,.55)}
@media screen and (prefers-reduced-motion:no-preference){
  #rpPaper.rpa .rps.mo-in .dz-draw{stroke-dasharray:400;stroke-dashoffset:400;animation:dzDraw 2.2s cubic-bezier(.4,0,.2,1) .3s forwards}
  @keyframes dzDraw{to{stroke-dashoffset:0}}
  #rpOv .dz-blink{animation:dzBl 1.8s ease-in-out infinite}@keyframes dzBl{50%{opacity:.25}}
}
@media print{#rpOv .dz-draw{stroke-dasharray:none!important;stroke-dashoffset:0!important}#rpOv .dz-blink{animation:none}}
</style>`;

  const R = [
    { k: "all", en: "The season file", a: "ملف الموسم كامل", d: "الغلاف والمحتويات والفصول الستة في ملف واحد" },
    ...CH.map(c => ({ k: c.k, en: c.en, a: c.ar, d: "الفصل " + c.n + " لوحده" }))
  ];
  W.__DOSSIER = { build, R, CH };
})();
