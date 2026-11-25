// one-off: find the Roshn league page on saff.com.sa (removed after use)
const get = async u => { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0", "accept-language": "ar" } }); const b = Buffer.from(await r.arrayBuffer()); let t = b.toString("utf8"); if (/�/.test(t.slice(0, 20000))) t = new TextDecoder("windows-1256").decode(b); return [r.status, t]; };
const strip = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const [, home] = await get("https://www.saff.com.sa/championship.php?id=416");
const links = [...home.matchAll(/championship\.php\?id=(\d+)['"][^>]*>([^<]+)</g)].map(m => m[1] + " " + m[2].trim());
console.log("LINKS", [...new Set(links)].join(" | "));
for (const u of ["https://www.saff.com.sa/championships.php", "https://www.saff.com.sa/"]) {
  try { const [s, h] = await get(u); console.log("PAGE", u, s, [...new Set([...h.matchAll(/championship\.php\?id=(\d+)['"]?[^>]*>([^<]{2,80})</g)].map(m => m[1] + " " + m[2].trim()))].join(" | ").slice(0, 3000)); } catch (e) { console.log("PAGE", u, e.message); }
}
for (let id = 400; id <= 432; id++) {
  try { const [s, h] = await get(`https://www.saff.com.sa/championship.php?id=${id}`); const t = (h.match(/<title>([^<]*)/) || [])[1] || ""; const h1 = strip((h.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/) || [])[1] || "").slice(0, 80);
    console.log("ID", id, s, t.trim().slice(0, 80), "|", h1, "| rows", (h.match(/fixture_td_2_/g) || []).length, "| روشن", /روشن/.test(h), "| table", (h.match(/team\.php\?id=/g) || []).length); } catch (e) { console.log("ID", id, e.message); }
}
