/* توقع المباريات: نموذج ديكسون-كولز (Dixon–Coles) مبني على نتائج دوري الأولى هذا الموسم
   - لكل فريق قوة هجوم وقوة دفاع، تُحسب من كل مباريات الدوري الملعوبة (مو من الجدول بس)،
     مع وزن أكبر للمباريات الأحدث، وتقريب الفرق اللي لعبت قليل من المتوسط.
   - أفضلية الأرض تُحسب من نتائج الدوري نفسه بدل رقم ثابت.
   - تصحيح النتائج الصغيرة (0-0، 1-0، 0-1، 1-1) لأن كورة القدم فيها تعادلات أكثر مما يتوقعه بواسون العادي.
   - الإعدادات (DECAY، SHRINK، RHO) اختيرت باختبار رجعي: نتوقع كل مباراة ملعوبة من المباريات اللي قبلها بس، ونقارن بالنتيجة.
   المؤلفة: تريم إياد السقاف · كُتب بمساعدة أداة Claude بتوجيهها */
(function (root) {
  const CFG = { HALF_LIFE: 60, SHRINK: 1, RHO: -0.15, MAXG: 10 };

  const DAY = 864e5;
  const fac = [1]; for (let i = 1; i <= 20; i++) fac[i] = fac[i - 1] * i;
  const po = (l, k) => Math.exp(-l) * Math.pow(l, k) / fac[k];

  /* fit: matches = [{home, away, date, hg, ag}], asOf = "YYYY-MM-DD" (only matches before it are used) */
  function fit(matches, asOf, cfg) {
    cfg = Object.assign({}, CFG, cfg || {});
    const ms = matches.filter(m => !asOf || m.date < asOf);
    if (ms.length < 12) return null;
    const ref = Date.parse(asOf || ms.reduce((x, m) => (m.date > x ? m.date : x), ms[0].date));
    const xi = Math.log(2) / cfg.HALF_LIFE;
    const teams = [...new Set(ms.flatMap(m => [m.home, m.away]))];
    const A = {}, D = {}; teams.forEach(t => (A[t] = 0, D[t] = 0));
    const W = ms.map(m => Math.exp(-xi * Math.max(0, (ref - Date.parse(m.date)) / DAY)));
    const sw = W.reduce((s, w) => s + w, 0);
    let c = Math.log(Math.max(0.2, ms.reduce((s, m, i) => s + W[i] * (m.hg + m.ag), 0) / (2 * sw))), H = 0.1;
    // the prior is "an average team": the shrink strength is in matches' worth of weight
    const tau = cfg.SHRINK;
    for (let it = 0; it < 60; it++) {
      // intercept and home advantage
      let g = 0, h = 0, gh = 0, hh = 0;
      ms.forEach((m, i) => {
        const lh = Math.exp(c + H + A[m.home] + D[m.away]), la = Math.exp(c + A[m.away] + D[m.home]);
        g += W[i] * (m.hg - lh + m.ag - la); h += W[i] * (lh + la);
        gh += W[i] * (m.hg - lh); hh += W[i] * lh;
      });
      c += g / h; H += (gh - 0.5 * H) / (hh + 0.5);   // light pull of home advantage toward 0
      for (const t of teams) {
        let ga = 0, ha = tau, gd = 0, hd = tau;
        ms.forEach((m, i) => {
          if (m.home === t) {
            const lh = Math.exp(c + H + A[t] + D[m.away]), la = Math.exp(c + A[m.away] + D[t]);
            ga += W[i] * (m.hg - lh); ha += W[i] * lh; gd += W[i] * (m.ag - la); hd += W[i] * la;
          } else if (m.away === t) {
            const lh = Math.exp(c + H + A[m.home] + D[t]), la = Math.exp(c + A[t] + D[m.home]);
            ga += W[i] * (m.ag - la); ha += W[i] * la; gd += W[i] * (m.hg - lh); hd += W[i] * lh;
          }
        });
        A[t] += (ga - tau * A[t]) / ha; D[t] += (gd - tau * D[t]) / hd;
      }
      // keep the average attack at zero so c stays the league scoring rate
      const ma = teams.reduce((s, t) => s + A[t], 0) / teams.length, md = teams.reduce((s, t) => s + D[t], 0) / teams.length;
      teams.forEach(t => (A[t] -= ma, D[t] -= md)); c += ma + md;
    }
    return { c, H, A, D, rho: cfg.RHO, n: ms.length, maxg: cfg.MAXG };
  }

  function tau2(i, j, lh, la, rho) {
    if (i === 0 && j === 0) return 1 - lh * la * rho;
    if (i === 0 && j === 1) return 1 + lh * rho;
    if (i === 1 && j === 0) return 1 + la * rho;
    if (i === 1 && j === 1) return 1 - rho;
    return 1;
  }

  /* chances for one match; neutral = no home advantage */
  function match(model, home, away, neutral) {
    if (!model || !(home in model.A) || !(away in model.A)) return null;
    const lh = Math.exp(model.c + (neutral ? model.H / 2 : model.H) + model.A[home] + model.D[away]);
    const la = Math.exp(model.c + (neutral ? model.H / 2 : 0) + model.A[away] + model.D[home]);
    const N = model.maxg, M = [];
    let pw = 0, pd = 0, pl = 0, tot = 0;
    for (let i = 0; i <= N; i++) { M[i] = []; for (let j = 0; j <= N; j++) {
      const p = Math.max(0, po(lh, i) * po(la, j) * tau2(i, j, lh, la, model.rho)); M[i][j] = p; tot += p;
      if (i > j) pw += p; else if (i === j) pd += p; else pl += p; } }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) M[i][j] /= tot;
    const list = []; for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5; j++) list.push([i, j, M[i][j]]);
    list.sort((x, y) => y[2] - x[2]);
    return { lh, la, pw: pw / tot, pd: pd / tot, pl: pl / tot, M, tot: 1, top: list.slice(0, 5) };
  }

  /* league matches already played, in the shape fit() wants */
  function played(S) {
    return (S.matches || []).filter(m => m.comp === "league" && m.status === "played" && Array.isArray(m.score))
      .map(m => ({ home: m.home, away: m.away, date: m.date, hg: m.score[0], ag: m.score[1] }));
  }

  const api = { CFG, fit, match, played };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PREDICT = api;
})(typeof window !== "undefined" ? window : this);
