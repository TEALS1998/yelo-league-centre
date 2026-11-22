/* سجل الانضباط: قرارات لجنة الانضباط والأخلاق في دوري الدرجة الأولى للمحترفين
   المصدر: موقع الاتحاد السعودي لكرة القدم */
window.DISCIPLINE = {
  source: "https://www.saff.com.sa/about.php?id=3&type=13&menu=4",
  decisions: [
    {
      no: "87/ل ض/2026",
      date: "2026-11-17",
      match: { home: "الجندل", away: "هجر", date: "2026-11-07" },
      person: "أيوب دربال",
      role: "لاعب",
      club: "هجر",
      reason: "بطاقة حمراء مباشرة بسبب اللعب العنيف تجاه لاعب الفريق المنافس",
      ban: 1,
      fine: 7500
    }
  ]
};

/* الشكل والألوان */
document.head.insertAdjacentHTML("beforeend", `<style>
#discipline{padding:18px}
.ds-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.ds-stats div{background:#f4f1ed;border-radius:12px;padding:12px 14px}
.ds-stats b{display:block;font-size:26px}
.ds-stats span{font-size:12px;opacity:.7}
.ds-card{display:flex;gap:14px;align-items:center;padding:12px 0;border-top:1px solid #e6e1da;direction:rtl}
.ds-logo{width:42px;height:42px;object-fit:contain}
.ds-main{flex:1;display:flex;flex-direction:column;gap:3px}
.ds-sub,.ds-match{font-size:12px;opacity:.65}
.ds-why{font-size:13.5px}
.ds-tags{display:flex;flex-direction:column;gap:5px;align-items:flex-end}
.ds-ban{background:#c96f68;color:#fff;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700}
.ds-fine{background:#efe6d6;border-radius:20px;padding:3px 10px;font-size:12px}
.ds-no{font-size:11px;opacity:.6}
</style>`);

/* نضيف القسم في آخر الصفحة */
document.querySelector("main, body").insertAdjacentHTML("beforeend", `
  <div class="sec rv in"><span class="num">07</span><div><b>Discipline</b><span class="ar">سجل الانضباط</span></div></div>
  <article class="card rv in" id="discipline"></article>`);

/* قسم سجل الانضباط: يعرض قرارات الاتحاد على شكل بطاقات */
(() => {
  const L = window.LEAGUE_DATA, DIS = window.DISCIPLINE;
  const box = document.getElementById("discipline");
  if (!L || !DIS || !box) return;

  // أدوات صغيرة
  const nameEn = t => L.teams[t] || t;            // اسم النادي بالإنجليزي
  const logo = t => L.logos[t] || "";              // شعار النادي
  const money = n => n.toLocaleString("en-US");    // 7500 تصير 7,500
  const safe = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // الأحدث أولاً
  const list = DIS.decisions.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  // الأرقام اللي فوق
  const totalBan = list.reduce((sum, d) => sum + d.ban, 0);
  const totalFine = list.reduce((sum, d) => sum + d.fine, 0);
  const stats = `
    <div class="ds-stats">
      <div><b>${list.length}</b><span>Decisions · قرارات</span></div>
      <div><b>${totalBan}</b><span>Matches banned · مباريات إيقاف</span></div>
      <div><b>${money(totalFine)}</b><span>Fines (SAR) · غرامات بالريال</span></div>
    </div>`;

  // بطاقة لكل قرار
  const card = d => `
    <div class="ds-card">
      <img class="ds-logo" src="${logo(d.club)}" alt="">
      <div class="ds-main">
        <b>${safe(d.person)}</b>
        <span class="ds-sub">${safe(d.role)} · ${safe(d.club)} · ${safe(nameEn(d.club))}</span>
        <span class="ds-why">${safe(d.reason)}</span>
        <span class="ds-match">${safe(d.match.home)} × ${safe(d.match.away)} · ${d.match.date}</span>
      </div>
      <div class="ds-tags">
        ${d.ban ? `<span class="ds-ban">إيقاف ${d.ban} ${d.ban === 1 ? "مباراة" : "مباريات"}</span>` : ""}
        ${d.fine ? `<span class="ds-fine">غرامة ${money(d.fine)} ريال</span>` : ""}
        <a class="ds-no" href="${DIS.source}" target="_blank" rel="noopener">قرار ${safe(d.no)}</a>
      </div>
    </div>`;

  box.innerHTML = stats + list.map(card).join("");
})();
