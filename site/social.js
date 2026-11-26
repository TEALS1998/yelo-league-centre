/* Official social accounts of the First Division League and its clubs (checked November 2026).
   li: the club's LinkedIn company page where one exists; clubs without a verified page get a LinkedIn search instead. */
window.SOCIAL = {
 league: { name: "دوري الأولى", x: "FDL_KSA", ig: "saudifdl", li: "first-division-league", web: "https://fdl.sa" },
 spl: { name: "دوري روشن", x: "SPLEN", web: "https://www.spl.com.sa" },
 clubs: {
  /* Roshn league clubs: only accounts checked against the club's own profile */
  "الهلال": { x: "Alhilal_FC" },
  "النصر": { x: "AlNassrFC" },
  "الاتحاد": { x: "ittihad" },
  "الأهلي": { x: "ALAHLI_FC" },
  "الشباب": { x: "AlShababSaudiFC" },
  "القادسية": { x: "Alqadsiah" },
  "الاتفاق": { x: "Ettifaq" },
  "نيوم": { x: "NEOMSportsClub" },
  "الخليج": { x: "Khaleejclub" },
  "الخلود": { x: "AlKholoodClub" },
  "الرياض": { x: "AlRiyadhFC" },
  "الفيحاء": { x: "AlfayhaSC" },
  "الحزم": { x: "alhazem_fc" },
  "الفيصلي": { x: "AlFaisaly" },
  "الفتح": { x: "FatehClub" },
  "التعاون": { x: "AltaawounFC" },
  "أبها": { x: "abhaFC" },
  "الدرعية": { x: "diriyahclub" },
  "العلا":    { x: "AlUlaclub",       ig: "alulaclub",      li: "%D9%86%D8%A7%D8%AF%D9%8A-%D8%A7%D9%84%D8%B9%D9%84%D8%A7-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A" },
  "الجبلين":  { x: "aljabalainFC",    ig: "aljabalainfc" },
  "الوحدة":   { x: "alwehdaclub1",    ig: "alwehdaclub1",   li: "alwehda-sfc" },
  "النجمة":   { x: "alnajmahfc",      ig: "alnajmahfc" },
  "ضمك":      { x: "DAMAC_CLUB",      ig: "damac_club" },
  "الزلفي":   { x: "club_zulfi",      ig: "club_zulfii" },
  "الأنوار":  { x: "alanwarclub" },
  "الصقر":    { x: "ALSAQERFC",       ig: "alsaqerfc" },
  "الطائي":   { x: "tai1381",         ig: "tai1381",        li: "al-tai-fc" },
  "العدالة":  { x: "aladalahclub",    ig: "aladalahclub" },
  "الرائد":   { x: "alraedclub",      ig: "alraedclub",     li: "%D9%86%D8%A7%D8%AF%D9%8A-%D8%A7%D9%84%D8%B1%D8%A7%D8%A6%D8%AF-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A-alraed-saudi-club" },
  "جدة":      { x: "Jeddahsportclub", ig: "jeddahsportclub" },
  "العروبة":  { x: "ALOROBAH_FC",     ig: "alorobah_fc" },
  "الجندل":   { x: "Aljandal_Fc",     ig: "aljandal_fc" },
  "الأخدود":  { x: "ALAKHDOUD",       ig: "alakhdoud" },
  "هجر":      { x: "HajerClub",       ig: "hajerclub" },
  "البكيرية": { x: "ALBUKIRYAH_FC",   ig: "albukiryah_fc" },
  "الجيل":    { x: "jeel_club",       ig: "jeel_club" }
 }
};
/* Draws the X button into an element (only X is shown, at the owner's request). */
window.drawSocial = function (el, s, label) {
  if (!el || !s) return;
  const I = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8.2c-.1-1.6-.4-3-1.6-4.2S17.4 2.2 15.8 2.1C14.1 2 9.9 2 8.2 2.1 6.6 2.2 5.2 2.5 4 3.7S2.2 6.6 2.1 8.2C2 9.9 2 14.1 2.1 15.8c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 5.9.1 7.6 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.7.1-5.9 0-7.6zM19.8 17.5a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.3.4s-4.1.1-5.3-.4a3 3 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.3s-.1-4.1.4-5.3A3 3 0 0 1 7.5 5.2c1.2-.5 4-.4 5.3-.4s4.1-.1 5.3.4a3 3 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.3s.1 4.1-.4 5.3z"/></svg>',
    li: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>'
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const a = (k, href, t) => `<a class="soc-${k}" href="${esc(href)}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}">${I[k]}</a>`;
  let h = "";
  if (s.x) h += a("x", "https://x.com/" + s.x, "X · @" + s.x);
  el.innerHTML = h; el.hidden = false;
};
