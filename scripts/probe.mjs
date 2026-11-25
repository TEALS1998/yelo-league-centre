// one-off: dump the Roshn league (SAFF championship 415) so the site can be seeded (removed after use)
const get = async u => { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0", "accept-language": "ar" } }); const b = Buffer.from(await r.arrayBuffer()); let t = b.toString("utf8"); if (/�/.test(t.slice(0, 20000))) t = new TextDecoder("windows-1256").decode(b); return t; };
const text = h => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const html = await get("https://www.saff.com.sa/championship.php?id=415");
const rows = [];
for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) { const id = tr.match(/team\.php\?id=(\d+)/); if (!id) continue;
  const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(text).filter(Boolean); rows.push([+id[1], ...cells]); }
console.log("SPLTABLE " + JSON.stringify(rows));
const sel = html.match(/value="round=\d+&week=(\d+)"[^>]*selected|selected[^>]*value="round=\d+&week=(\d+)"/); console.log("SPLROUND", sel && (sel[1] || sel[2]));
const ids = [...new Set(rows.map(r => r[0]))];
for (const id of ids) {
  const h = await get(`https://saff.com.sa/team.php?id=${id}`);
  const re = /calendar_date=(\d{4}-\d{2}-\d{2})|championship\.php\?id=(\d+)['"][^>]*>([^<]+)<|id="fixture_td_(\d)_(\d+)"[^>]*>([\s\S]*?)<\/td>/g;
  let date = null, sec = ""; const fx = new Map();
  for (let m; (m = re.exec(h)); ) { if (m[1]) date = m[1]; else if (m[2]) sec = m[2] + ":" + text(m[3]); else { if (!fx.has(m[5])) fx.set(m[5], { d: date, s: sec, c: {} }); fx.get(m[5]).c[m[4]] = text(m[6]); } }
  const out = [...fx.entries()].filter(([, f]) => /^415:|روشن/.test(f.s)).map(([k, f]) => [k, f.d, f.c[1], f.c[2], f.c[3], f.c[4], f.c[5]]);
  const secs = [...new Set([...fx.values()].map(f => f.s))];
  console.log("SPLTEAM " + id + " " + JSON.stringify({ secs, out }));
  await new Promise(r => setTimeout(r, 400));
}
