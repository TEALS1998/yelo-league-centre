// First Division League match centre: live updater for every club in the Saudi First Division League.
// Runs on GitHub Actions. Every run reads the league page (table + current round).
// Every 30 minutes, or when FULL=1, it also reads each club's SAFF team page (full fixture list).
// Rules: never delete a match, never blank a score or venue, never guess a result,
// and leave data.js untouched when the pages look wrong.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "site", "data.js");
const LEAGUE_URL = "https://www.saff.com.sa/championship.php?id=416";
const TEAM_URL = (id) => `https://saff.com.sa/team.php?id=${id}`;
const FULL_EVERY_MIN = 30;
const FIRST_TEAM_SECTIONS = ["الدرجة الأولى", "كأس خادم الحرمين"];
const OTHER_SECTIONS = ["تحت", "السيدات", "الناشئات", "الصالات", "الشاطئية", "الرديف"];
const log = (...a) => console.log("[league]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (First Division League match centre updater)", "accept-language": "ar,en;q=0.8" } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const utf = buf.toString("utf8"); // SAFF sometimes serves windows-1256 while declaring utf-8
  return /�/.test(utf.slice(0, 20000)) ? new TextDecoder("windows-1256").decode(buf) : utf;
}
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const norm = (s) => String(s || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();
const num = (s) => { const d = s.replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)); return /^-?\d+$/.test(d.trim()) ? +d : null; };
const riyadhToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;

export function loadData(file = DATA) {
  const src = fs.readFileSync(file, "utf8");
  const header = src.slice(0, src.indexOf("window.LEAGUE_DATA"));
  const window = {}; new Function("window", src)(window);
  return { header, D: window.LEAGUE_DATA };
}
function saveData(header, D) {
  const out = header + "window.LEAGUE_DATA = " + JSON.stringify(D, null, 1) + ";\n";
  const check = {}; new Function("window", out)(check);
  const S = check.LEAGUE_DATA?.seasons?.[D.current];
  if (!S?.matches?.length || !S?.table?.rows?.length) throw new Error("refusing to write a broken data.js");
  fs.writeFileSync(DATA, out);
}

export function teamMatcher(D) {
  const byNorm = new Map(Object.keys(D.teams || {}).map((k) => [norm(k), k]));
  return (s) => {
    const n = norm(s).replace(/^نادي /, "");
    if (byNorm.has(n)) return byNorm.get(n);
    for (const [k, v] of byNorm) if (n.endsWith(" " + k) || n.startsWith(k + " ")) return v;
    return null;
  };
}

// Standings rows, with each club's SAFF team id taken from its link.
export function parseTable(html, teamOf) {
  const rows = [], ids = {};
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(text).filter((c) => c !== "");
    const team = cells.map(teamOf).find(Boolean);
    const nums = cells.map(num).filter((n) => n !== null);
    if (!team || nums.length < 8) continue;
    const [pos, p, w, d, l, gf, ga] = nums;
    const pts = nums[nums.length - 1];
    if (w + d + l !== p || w * 3 + d !== pts) continue;
    rows.push([team, pos, pts, p, w, d, l, gf, ga]);
    const id = tr.match(/team\.php\?id=(\d+)/);
    if (id) ids[team] = +id[1];
  }
  return { rows, ids };
}

// The round shown on the league page ("الجولة: 11" is the selected one).
export function parseRound(html) {
  const sel = html.match(/<option[^>]*selected[^>]*value="round=\d+&week=(\d+)"|<option[^>]*value="round=\d+&week=(\d+)"[^>]*selected/);
  if (sel) return +(sel[1] || sel[2]);
  const t = text(html);
  const m = t.match(/\*\s*الجولة\s*:?\s*(\d{1,2})/) || t.match(/الجولة\s*:?\s*(\d{1,2})\s*\*/) ||
    html.match(/selected[^>]*>\s*الجولة\s*:?\s*(\d{1,2})/) || html.match(/الجولة\s*:?\s*(\d{1,2})<\/option>\s*<\/select>/);
  return m ? +m[1] : null;
}

// SAFF fixture rows: cells fixture_td_1_<id> time, _2_ home, _3_ score or "-", _4_ away, _5_ venue.
export function parseFixtures(html, teamOf, defaultSection = "") {
  const re = /calendar_date=(\d{4}-\d{2}-\d{2})|championship\.php\?id=(\d+)['"][^>]*>([^<]+)<|id="fixture_td_(\d)_(\d+)"[^>]*>([\s\S]*?)<\/td>/g;
  let date = null, section = defaultSection;
  const fx = new Map();
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) date = m[1];
    else if (m[2]) section = text(m[3]) + " #" + m[2];
    else {
      const id = m[5];
      if (!fx.has(id)) fx.set(id, { id, date, section, cells: {} });
      const tid = m[6].match(/team\.php\?id=(\d+)/);
      fx.get(id).cells[m[4]] = { t: text(m[6]), tid: tid ? +tid[1] : null };
    }
  }
  const out = [];
  for (const f of fx.values()) {
    const c = f.cells;
    if (!c[2] || !c[4] || !f.date) continue;
    const home = teamOf(c[2].t), away = teamOf(c[4].t);
    if (!home || !away) continue;
    const tm = c[1] && c[1].t.match(/(\d{1,2}):(\d{2})/);
    const sc = c[3] && c[3].t.match(/^(\d{1,2})\s*-\s*(\d{1,2})/);
    out.push({ saffId: f.id, section: f.section, date: f.date, time: tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : null,
      home, away, homeId: c[2].tid, awayId: c[4].tid, score: sc ? [+sc[1], +sc[2]] : null, venueText: c[5] ? c[5].t : null });
  }
  return out;
}
export const firstTeam = (sec) => / #416$/.test(sec) || (FIRST_TEAM_SECTIONS.some((s) => sec.includes(s)) && !OTHER_SECTIONS.some((s) => sec.includes(s)));
const isCup = (sec) => sec.includes("كأس");

// Match SAFF's venue text to a venue key in data.js (keys look like "ملعب نادي هجر (الأحساء)").
const CORE_DROP = /^(استاد|ملعب|مدينة|نادي|الرياضية|الرياضي|جامعة|إدارة|ادارة)$/;
export function venueMatcher(D) {
  const entries = Object.keys(D.venues || {}).filter((k) => k.includes("(")).map((k) => {
    const name = norm(k.replace(/\s*\([^)]*\)\s*$/, ""));
    const core = name.split(" ").filter((w) => !CORE_DROP.test(w)).join(" ");
    return { k, name, core };
  });
  return (t) => {
    const n = norm(t).replace(/\s/g, "");
    if (!n) return null;
    let best = null;
    for (const e of entries) { const c = e.core.replace(/\s/g, ""); if (c && n.includes(c) && (!best || c.length > best.c)) best = { k: e.k, c: c.length }; }
    return best ? best.k : null;
  };
}

const LABEL = (() => {
  const DE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], DA = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const ME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], MA = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return (date, time) => { const [y, m, d] = date.split("-").map(Number); const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return [`${DE[wd]} ${d} ${ME[m - 1]} ${y}${time ? " " + time : ""}`, `${DA[wd]} ${d} ${MA[m - 1]}${time ? " " + time : ""}`]; };
})();

// Merge one SAFF fixture into the season. Returns a text line when something changed.
export function applyFixture(S, D, f, venueOf, round, changes) {
  const comp = isCup(f.section) ? "cup" : "league";
  const today = riyadhToday();
  let x = S.matches.find((m) => m.saffId && m.saffId === f.saffId);
  if (!x) {
    // same host and visitor in the same competition (a league pairing happens once per host)
    const cand = S.matches.filter((m) => m.home === f.home && m.away === f.away && m.comp === comp && (comp === "league" || days(m.date, f.date) < 60));
    x = cand.sort((a, b) => days(a.date, f.date) - days(b.date, f.date))[0];
    if (x && !x.saffId) x.saffId = f.saffId;
  }
  const venue = venueOf(f.venueText) || (x && x.venue) || D.clubs?.[f.home]?.home || null;
  if (!x) {
    const id = (comp === "cup" ? "c" : "m") + f.saffId;
    x = { id, saffId: f.saffId, comp, round: comp === "league" ? round || null : null, date: f.date, time: f.time, home: f.home, away: f.away,
      venue, status: f.score && f.date <= today ? "played" : "upcoming", score: f.score && f.date <= today ? f.score : null };
    S.matches.push(x);
    changes.push(`new ${f.home} v ${f.away} ${f.date}`);
    return x;
  }
  if (round && comp === "league" && !x.roundExact) { x.round = round; x.roundExact = true; }
  if (x.status === "played") {
    if (f.score && JSON.stringify(f.score) !== JSON.stringify(x.score)) { x.score = f.score; changes.push(`score corrected ${x.home} ${f.score.join("-")} ${x.away}`); }
    return x;
  }
  if (f.score && f.date <= today) { x.status = "played"; x.score = f.score; changes.push(`result ${x.home} ${f.score.join("-")} ${x.away}`); return x; }
  if (x.status === "postponed" && f.date >= today) {
    // SAFF has given a postponed match a new date: it is back on the schedule
    x.status = "upcoming";
    (x.changes ||= []).push({ field: "status", from: ["Postponed", "مؤجلة"], to: ["Back on: " + LABEL(f.date, f.time || x.time)[0], "عادت للجدول: " + LABEL(f.date, f.time || x.time)[1]], at: today });
    changes.push(`back on ${x.home} v ${x.away} ${f.date}`);
  }
  if (f.date !== x.date || (f.time && f.time !== x.time)) {
    const from = LABEL(x.date, x.time), to = LABEL(f.date, f.time || x.time);
    if (f.date !== x.date && !x.orig) x.orig = x.date;
    (x.changes ||= []).push({ field: f.date !== x.date ? "date" : "time", from, to, at: today });
    changes.push(`moved ${x.home} v ${x.away}: ${x.date} ${x.time || ""} to ${f.date} ${f.time || ""}`);
    x.date = f.date; if (f.time) x.time = f.time;
    delete x.weather;
  }
  if (venue && x.venue && venue !== x.venue && venueOf(f.venueText)) {
    (x.changes ||= []).push({ field: "venue", from: [x.venue, x.venue], to: [venue, venue], at: today });
    changes.push(`venue ${x.home} v ${x.away}: ${venue}`);
    x.venue = venue; delete x.weather;
  } else if (!x.venue && venue) x.venue = venue;
  return x;
}

// Rounds for league fixtures that SAFF never showed us with a round number:
// each round is a weekend window; place every club once per round, nearest window by first published date.
export function fillRounds(S) {
  const L = S.matches.filter((m) => m.comp === "league");
  const anchor = {};
  for (const m of L) if (m.round) (anchor[m.round] ||= []).push(Date.parse(m.orig || m.date));
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const centres = Object.entries(anchor).map(([r, a]) => [+r, med(a)]).sort((a, b) => a[0] - b[0]);
  if (centres.length < 2) return;
  const est = (r) => { // linear between known rounds, extrapolated at the ends
    let lo = centres[0], hi = centres[centres.length - 1];
    for (const c of centres) { if (c[0] <= r) lo = c; if (c[0] >= r) { hi = c; break; } }
    if (lo[0] === hi[0]) { const [a, b] = r < centres[0][0] ? [centres[0], centres[1]] : [centres[centres.length - 2], centres[centres.length - 1]]; return a[1] + (r - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); }
    return lo[1] + (r - lo[0]) * (hi[1] - lo[1]) / (hi[0] - lo[0]);
  };
  const N = S.totalRounds || 34;
  const used = {}; // club -> Set(rounds)
  for (const m of L) if (m.round) for (const t of [m.home, m.away]) (used[t] ||= new Set()).add(m.round);
  const todo = L.filter((m) => !m.round).sort((a, b) => Date.parse(a.orig || a.date) - Date.parse(b.orig || b.date));
  for (const m of todo) {
    const t = Date.parse(m.orig || m.date);
    let best = null;
    for (let r = 1; r <= N; r++) {
      if (used[m.home]?.has(r) || used[m.away]?.has(r)) continue;
      const d = Math.abs(est(r) - t);
      if (!best || d < best.d) best = { r, d };
    }
    if (best) { m.round = best.r; for (const t2 of [m.home, m.away]) (used[t2] ||= new Set()).add(best.r); }
  }
}

// ---------- weather (Open-Meteo, no key) ----------
const WMO = (code, night) => code >= 95 ? "storm" : (code >= 51 && code <= 67) || (code >= 80 && code <= 86) ? "rain" : code >= 45 && code <= 48 ? "fog" : code === 3 ? "cloud" : code === 2 || code === 1 ? "partly" : night ? "clear" : "sun";
const nightAt = (time) => { const [h, mi] = (time || "19:00").split(":").map(Number); return h >= 18 || (h === 17 && mi >= 30); };
async function weatherFor(D, S) {
  const today = riyadhToday();
  const byVenue = {};
  for (const m of S.matches) {
    const v = D.venues[m.venue]; if (!v || v.length < 3) continue;
    (byVenue[m.venue] ||= []).push(m);
  }
  let n = 0;
  for (const [venue, ms] of Object.entries(byVenue)) {
    const [, la, lo] = D.venues[venue];
    const want = ms.filter((m) => {
      const w = m.weather; const dd = (Date.parse(m.date) - Date.parse(today)) / 864e5;
      if (m.status === "played") return !w || (w.src !== "observed" && dd < -5);
      if (dd <= 14) return !w || w.src !== "forecast" || w.at !== today;
      return !w;
    });
    if (!want.length) continue;
    const pick = (data, m, src) => {
      const hh = (m.time || "19:00").slice(0, 2);
      const i = data.hourly.time.findIndex((t) => t.startsWith(m.date) && t.slice(11, 13) === hh);
      if (i < 0 || data.hourly.temperature_2m[i] == null) return false;
      m.weather = { t: Math.round(data.hourly.temperature_2m[i]), c: WMO(data.hourly.weather_code[i], nightAt(m.time)), src, at: today };
      return true;
    };
    try {
      const fc = want.filter((m) => m.status !== "played" && (Date.parse(m.date) - Date.parse(today)) / 864e5 <= 14);
      if (fc.length) {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=temperature_2m,weather_code&timezone=Asia%2FRiyadh&forecast_days=16`);
        if (r.ok) { const j = await r.json(); for (const m of fc) if (pick(j, m, "forecast")) n++; }
      }
      const past = want.filter((m) => m.status === "played");
      const far = want.filter((m) => m.status !== "played" && !fc.includes(m));
      if (past.length || far.length) {
        // observed for played matches; for far ones, the same date last year as "typical"
        const shift = (d, y) => (+d.slice(0, 4) + y) + d.slice(4);
        const dates = [...past.map((m) => m.date), ...far.map((m) => shift(m.date, -1))].sort();
        const end = dates[dates.length - 1] > shift(today, 0) ? today : dates[dates.length - 1];
        const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${la}&longitude=${lo}&start_date=${dates[0]}&end_date=${end}&hourly=temperature_2m,weather_code&timezone=Asia%2FRiyadh`);
        if (r.ok) {
          const j = await r.json();
          for (const m of past) if (pick(j, m, "observed")) n++;
          for (const m of far) { const ghost = { ...m, date: shift(m.date, -1) }; if (pick(j, ghost, "typical")) { m.weather = ghost.weather; n++; } }
        }
      }
    } catch (e) { log("weather failed for", venue, e.message); }
    await sleep(250);
  }
  return n;
}

async function main() {
  const { header, D } = loadData();
  const S = D.seasons[D.current];
  const teamOf = teamMatcher(D), venueOf = venueMatcher(D);
  const changes = [];
  let ok = 0;

  // 1. league page: table, club ids, current round
  try {
    const html = await get(LEAGUE_URL);
    const { rows, ids } = parseTable(html, teamOf);
    if (rows.length >= 16) {
      ok++;
      rows.sort((a, b) => a[1] - b[1]);
      if (JSON.stringify(rows) !== JSON.stringify(S.table.rows)) {
        S.table.rows = rows; S.table.asOfRound = Math.max(...rows.map((r) => r[3]));
        changes.push(`table updated (leader ${rows[0][0]}, ${rows[0][2]} pts)`);
      }
      for (const [t, id] of Object.entries(ids)) { (D.clubs[t] ||= {}).saffId = id; }
      const round = parseRound(html);
      if (round) S.currentRound = round;
      for (const f of parseFixtures(html, teamOf, "دوري الدرجة الأولى #416")) applyFixture(S, D, f, venueOf, round, changes);
    } else log("standings not recognised, rows:", rows.length);
  } catch (e) { log("league page failed:", e.message); }

  // 2. every round page and every club's team page, every FULL_EVERY_MIN minutes
  const due = process.env.FULL === "1" || new Date().getUTCMinutes() % FULL_EVERY_MIN < 2; // one run in each half hour window
  if (due) {
    let weeks = 0, failed = 0, lastListed = "";
    const seen = new Set();
    for (let r = 1; r <= (S.totalRounds || 34); r++) {
      try {
        const html = await get(`${LEAGUE_URL}&round=0&week=${r}`);
        const fx = parseFixtures(html, teamOf, "دوري الدرجة الأولى #416");
        for (const f of fx) { const x = applyFixture(S, D, f, venueOf, r, changes); if (x) seen.add(x.id); if (f.date > lastListed) lastListed = f.date; }
        if (fx.length) weeks++;
      } catch (e) { failed++; log("round page failed:", r, e.message); }
      await sleep(900);
    }
    if (weeks) { ok++; log("round pages read:", weeks); }
    // A future league match that SAFF no longer lists in any round, while SAFF lists league matches after it,
    // has been taken off the schedule: show it as postponed instead of keeping a date SAFF does not publish.
    if (weeks && !failed && lastListed) {
      const today = riyadhToday();
      for (const x of S.matches) {
        if (x.comp !== "league" || x.status !== "upcoming" || seen.has(x.id) || x.date < today || x.date >= lastListed) continue;
        x.status = "postponed"; if (!x.orig) x.orig = x.date; delete x.weather;
        (x.changes ||= []).push({ field: "date", from: LABEL(x.date), to: ["Not set", "لم يُحدد"], at: today },
          { field: "status", from: LABEL(x.date, x.time), to: ["Postponed · new date not set", "مؤجلة · لم يُحدد الموعد الجديد"], at: today });
        changes.push(`postponed ${x.home} v ${x.away} (was ${x.date}, no longer on SAFF)`);
      }
    }
    let read = 0;
    for (const [t, c] of Object.entries(D.clubs)) {
      if (!c.saffId) continue;
      try {
        const html = await get(TEAM_URL(c.saffId));
        const fx = parseFixtures(html, teamOf).filter((f) => firstTeam(f.section) && (f.home === t || f.away === t));
        for (const f of fx) applyFixture(S, D, f, venueOf, null, changes);
        if (fx.length) read++;
      } catch (e) { log("team page failed:", t, e.message); }
      await sleep(1200);
    }
    if (read) { ok++; log("team pages read:", read); }
  }

  if (!ok) { log("no SAFF page could be read; data left unchanged"); return; }
  fillRounds(S);
  S.matches.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || "").localeCompare(b.time || "")));
  if (process.env.WEATHER !== "0") { const n = await weatherFor(D, S); if (n) log("weather updated:", n); }
  D.lastChecked = riyadhToday();
  saveData(header, D);
  fs.writeFileSync(path.join(ROOT, "last-run.json"), JSON.stringify({ at: new Date().toISOString(), changes }, null, 1) + "\n");
  log(changes.length ? changes.join("; ") : "no changes");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname))
  main().catch((e) => { console.error(e); process.exitCode = 1; });
