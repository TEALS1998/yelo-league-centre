// one-off: where SAFF keeps club badges on team pages (removed after use)
const get = async u => { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0", "accept-language": "ar" } }); return await r.text(); };
for (const id of [1, 121, 415]) {
  const h = await get(id === 415 ? "https://www.saff.com.sa/championship.php?id=415" : `https://saff.com.sa/team.php?id=${id}`);
  const imgs = [...h.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[0].slice(0, 160));
  console.log("IMGS", id, imgs.length, JSON.stringify(imgs.slice(0, 40)));
}
