/* سجل الانضباط: قرارات لجنة الانضباط والأخلاق في دوري الأولى، على شكل بطاقات حكم
   المصدر: موقع الاتحاد السعودي لكرة القدم
   الفكرة والتصميم: تريم السقاف · الكود: Claude بتوجيه صاحبة المشروع */

/* ============================================================
   لوحة التحكم: غيّري القيم هنا فقط، وكل القسم يتغير معها
   ============================================================ */
const PANEL = {
  red:    "#d63b32",   // لون البطاقة الحمراء
  yellow: "#f4c430",   // لون البطاقة الصفراء
  white:  "#e4e7eb",   // لون بطاقة الاحتجاج
  tilt:   5,           // قد إيش تميل البطاقة (بالدرجات، 0 يعني مستقيمة)
  flip:   true,        // true تنقلب البطاقة لما تمرّين عليها، false ما تنقلب

  // النصوص
  title:      "سجل الانضباط",
  titleEn:    "Discipline",
  subtitle:   "قرارات لجنة الانضباط والأخلاق المنشورة في موقع الاتحاد",
  subtitleEn: "Published decisions of the SAFF Discipline and Ethics Committee",
  hint:       "مرّري على البطاقة أو اضغطي عليها عشان تشوفين تفاصيل القرار",
  clean:      "سجل نظيف",
  cleanEn:    "Clean record",
  cleanNote:  "ما صدر بحق النادي أي قرار انضباطي هذا الموسم",
  away:       "غيابات الخصم",
  awayEn:     "Opponent absences",
  awayNone:   "ما فيه لاعب موقوف عند الخصم في المباراة الجاية",
  ours:       "غياباتنا",
  oursEn:     "Our absences"
};
/* ============================================================ */

window.DISCIPLINE = window.DISCIPLINE || {   // البيانات التلقائية من discipline-data.js، وهذي احتياط
  source: "https://www.saff.com.sa/about.php?id=3&type=13&menu=4",
  decisions: []
};

(() => {
  const L = window.LEAGUE_DATA || window.ALULA_DATA, DIS = window.DISCIPLINE;
  if (!L || !DIS || !DIS.checked) return;   // ما وصلت البيانات؟ ما نعرض شي بدل ما نعرض معلومة غلط

  // الصفحة: صفحة الدوري تعرض الكل، وصفحة النادي تعرض ناديها بس
  const US = window.US_TEAM || (window.ALULA_DATA ? "العلا" : null);
  const P = PANEL;

  // أدوات صغيرة
  const nameEn = t => L.teams[t] || t;
  const crest = document.querySelector(".crest img");
  const logo = t => (L.logos && L.logos[t]) || (t === US && crest ? crest.src : "");
  const img = t => (logo(t) ? `<img src="${logo(t)}" alt="">` : "");
  const money = n => n.toLocaleString("en-US");
  const safe = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = d => new Date(d + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long" });
  const plural = n => (n === 1 ? "مباراة" : n === 2 ? "مباراتين" : "مباريات");
  const yellows = d => +((d.reason.match(/حصول\s+(\d+)/) || [])[1] || 0);
  const kind = d => (d.role === "احتجاج" ? "white" : d.role === "نادي" ? "yellow" : "red");

  /* الشكل */
  document.head.insertAdjacentHTML("beforeend", `<style>
#discipline{padding:20px;overflow:hidden;--red:${P.red};--yel:${P.yellow};--wht:${P.white};--tilt:${P.tilt}deg}
#discipline .ds-hint{font-size:12px;opacity:.6;margin:0 0 14px;direction:rtl}
.ds-stats{display:flex;gap:18px;flex-wrap:wrap;margin:4px 0 22px;direction:rtl}
.ds-mini{display:flex;align-items:center;gap:10px}
.ds-mini i{width:30px;height:42px;border-radius:4px;display:block;box-shadow:0 3px 8px rgba(0,0,0,.18);transform:rotate(calc(var(--tilt) * -1))}
.ds-mini b{display:block;font-size:24px;line-height:1}
.ds-mini span{font-size:11.5px;opacity:.7}
.ds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:26px 20px;direction:rtl}
.dc{position:relative;aspect-ratio:5/7;perspective:900px;cursor:pointer;outline:none}
.dc .dc-stk{position:absolute;inset:0;border-radius:12px;background:var(--yel);box-shadow:0 2px 6px rgba(0,0,0,.15)}
.dc .dc-stk.dc-r{background:var(--red)}
.dc-in{position:absolute;inset:0;transition:transform .6s cubic-bezier(.3,.7,.3,1);transform-style:preserve-3d;transform:rotate(var(--t))}
${P.flip ? `.dc:hover .dc-in,.dc:focus .dc-in,.dc.dc-on .dc-in{transform:rotate(0deg) rotateY(180deg)}` : ""}
.dc-f,.dc-b{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;-webkit-backface-visibility:hidden;padding:14px;display:flex;flex-direction:column;box-shadow:0 8px 20px rgba(0,0,0,.2);overflow:hidden}
.dc-f{color:#fff;background:var(--red)}
.dc-f:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.22),transparent 45%);pointer-events:none}
.dc.dc-yellow .dc-f{background:var(--yel);color:#2a2410}
.dc.dc-white .dc-f{background:var(--wht);color:#2a2f36}
.dc.dc-clean .dc-f{background:#fff;color:#2a2f36;border:2px dashed #b9c2cb;box-shadow:none}
.dc-f img{width:38px;height:38px;object-fit:contain;background:#fff;border-radius:50%;padding:4px}
.dc-f .dc-nm{margin-top:auto;font-weight:700;font-size:16px;line-height:1.25}
.dc-f .dc-cl{font-size:12px;opacity:.85}
.dc-f .dc-big{font-size:44px;font-weight:800;line-height:1;margin-top:10px}
.dc-f .dc-bl{font-size:11.5px;opacity:.9}
.dc-f .dc-no{position:absolute;top:14px;left:14px;font-size:10.5px;opacity:.8}
.dc-b{background:#fff;color:#1d232b;transform:rotateY(180deg);gap:6px;font-size:12.5px;line-height:1.45;border-top:6px solid var(--red)}
.dc.dc-yellow .dc-b{border-top-color:var(--yel)}
.dc.dc-white .dc-b{border-top-color:#9aa3ad}
.dc-b .dc-why{font-weight:600}
.dc-b .dc-mt,.dc-b .dc-out{font-size:11.5px;color:#6a727c}
.dc-b .dc-out b{color:#1d232b}
.dc-b .dc-tg{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}
.dc-b .dc-tg span{background:#f1f3f5;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700}
.dc-b a{font-size:11px;color:#2c8c84}
.ds-h{display:flex;align-items:baseline;gap:8px;margin:28px 0 12px;direction:rtl}
.ds-h b{font-size:16px}.ds-h span{font-size:12px;opacity:.6}
.ds-opp{display:flex;align-items:center;gap:12px;direction:rtl;background:#f4f1ed;border-radius:12px;padding:12px 14px;margin-bottom:16px}
.ds-opp img{width:36px;height:36px;object-fit:contain}
.ds-opp small{display:block;font-size:11.5px;opacity:.65}
@media(max-width:600px){#discipline{padding:14px}.ds-grid{grid-template-columns:repeat(2,1fr);gap:18px 14px}.ds-stats{gap:12px}
.dc-f,.dc-b{padding:10px}.dc-f .dc-big{font-size:32px}.dc-f .dc-nm{font-size:13.5px}.dc-f img{width:30px;height:30px}.dc-f .dc-no{top:10px;left:10px;font-size:9.5px}
.dc-b{font-size:10.5px;overflow:auto}.dc-b .dc-mt,.dc-b .dc-out{font-size:10px}}
.mnav.ds8{grid-template-columns:repeat(8,1fr)!important}
</style>`);

  /* القسم نفسه: في صفحة النادي يجي بعد الدور الثاني، وفي صفحة الدوري في آخر الصفحة */
  const h2 = document.getElementById("half2");
  const host = (h2 && h2.parentElement) || document.querySelector("main") || document.body;
  host.insertAdjacentHTML("beforeend", `
  <div class="sec rv in" id="discipline-h"><span class="num">07</span><div><b>${safe(P.titleEn)}</b><span class="ar">${safe(P.title)}</span></div><small>${safe(P.subtitleEn)}<span class="ar" style="display:block">${safe(P.subtitle)}</span></small></div>
  <article class="card s12 rv in" id="discipline"></article>`);
  const nav = document.querySelector(".mnav");
  if (nav && US) {
    nav.classList.add("ds8");
    nav.insertAdjacentHTML("beforeend", `<a href="#discipline-h"><svg viewBox="0 0 24 24"><rect x="7" y="3.5" width="10" height="15" rx="1.5" transform="rotate(10 12 11)"/></svg><span>Discipline</span><span class="ar">الانضباط</span></a>`);
  }
  const box = document.getElementById("discipline");

  // الأحدث أولاً
  const all = DIS.decisions.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const list = US ? all.filter(d => d.club === US) : all;

  /* البطاقة */
  let n = 0;
  const card = d => {
    const k = kind(d), y = yellows(d), red = /طرد/.test(d.reason);
    const t = (n++ % 2 ? 1 : -1) * P.tilt;
    let stack = "";
    if (k === "yellow") {                             // كومة بطاقات صفراء بعدد الإنذارات
      for (let i = 1; i < Math.max(y, 1); i++) {
        const last = red && i === 1;
        stack += `<i class="dc-stk${last ? " dc-r" : ""}" style="transform:rotate(${(t + i * 4 * (t < 0 ? -1 : 1)).toFixed(1)}deg) translate(${i * 2}px,${-i * 2}px)"></i>`;
      }
    }
    const big = k === "red" ? `<div class="dc-big">${d.ban}</div><div class="dc-bl">${plural(d.ban)} إيقاف</div>`
      : k === "yellow" ? `<div class="dc-big">${y || ""}</div><div class="dc-bl">إنذارات في مباراة وحدة${red ? " وطرد" : ""}</div>`
      : `<div class="dc-big">!</div><div class="dc-bl">احتجاج${d.appeal ? " · مرفوض شكلاً" : ""}</div>`;
    const out = (d.out || []).map(m => `<b>${safe(m.home)} × ${safe(m.away)}</b> · ${day(m.date)}`).join("<br>");
    return `
    <div class="dc dc-${k}" tabindex="0" style="--t:${t}deg">
      ${stack}
      <div class="dc-in">
        <div class="dc-f">
          <span class="dc-no">${safe(d.no)}</span>
          ${img(d.club)}
          ${big}
          <div class="dc-nm">${safe(k === "red" ? d.person : d.club)}</div>
          <div class="dc-cl">${safe(k === "red" ? d.club + " · " : "")}${safe(nameEn(d.club))}</div>
        </div>
        <div class="dc-b">
          <div class="dc-why">${safe(d.reason)}</div>
          <div class="dc-mt">المباراة: ${safe(d.match.home)} × ${safe(d.match.away)}${d.match.date ? " · " + day(d.match.date) : ""}</div>
          ${out ? `<div class="dc-out">يغيب عن: ${out}</div>` : ""}
          <div class="dc-tg">
            ${d.ban ? `<span>إيقاف ${d.ban} ${plural(d.ban)}</span>` : ""}
            ${d.fine ? `<span>غرامة ${money(d.fine)} ريال</span>` : ""}
          </div>
          <a href="${d.url || DIS.source}" target="_blank" rel="noopener">قرار ${safe(d.no)} · ${day(d.date)}</a>
        </div>
      </div>
    </div>`;
  };

  /* الأرقام على شكل بطاقات صغيرة */
  const bans = list.reduce((s, d) => s + (kind(d) === "red" ? 1 : 0), 0);
  const ylw = list.reduce((s, d) => s + yellows(d), 0);
  const fines = list.reduce((s, d) => s + (d.fine || 0), 0);
  const stats = `
    <div class="ds-stats">
      <div class="ds-mini"><i style="background:var(--red)"></i><div><b>${bans}</b><span>بطاقات حمراء بقرار إيقاف</span></div></div>
      <div class="ds-mini"><i style="background:var(--yel)"></i><div><b>${ylw}</b><span>إنذارات في غرامات الأندية</span></div></div>
      <div class="ds-mini"><i style="background:var(--wht)"></i><div><b>${money(fines)}</b><span>غرامات بالريال</span></div></div>
    </div>`;

  /* بطاقة السجل النظيف */
  const clean = `
    <div class="dc dc-clean" style="--t:${-P.tilt}deg"><div class="dc-in"><div class="dc-f">
      ${img(US)}
      <div class="dc-big">0</div><div class="dc-bl">قرارات هذا الموسم</div>
      <div class="dc-nm">${safe(P.clean)}</div><div class="dc-cl">${safe(P.cleanEn)}</div>
    </div></div></div>`;

  let html = `<p class="ds-hint">${safe(P.hint)}</p>` + (list.length ? stats : "") +
    `<div class="ds-grid">${list.length ? list.map(card).join("") : clean}</div>` +
    (US && !list.length ? `<p class="ds-hint" style="margin-top:14px">${safe(P.cleanNote)}</p>` : "");

  /* غيابات الخصم: لاعبين الخصم الموقوفين في مباراتنا الجاية */
  if (US) {
    const S = L.seasons[L.current], today = new Date().toISOString().slice(0, 10);
    const next = S.matches.filter(m => m.comp === "league" && m.status === "upcoming" && m.date >= today && (m.home === US || m.away === US))
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (next) {
      const opp = next.home === US ? next.away : next.home;
      const hits = c => all.filter(d => d.club === c && (d.out || []).some(m => m.date === next.date && m.home === next.home && m.away === next.away));
      const theirs = hits(opp), ours = hits(US);
      n = 0;
      html += `
      <div class="ds-h"><b>${safe(P.away)}</b><span>${safe(P.awayEn)}</span></div>
      <div class="ds-opp">${img(opp)}<div><b>${safe(next.home)} × ${safe(next.away)}</b><small>${day(next.date)}${next.round ? " · الجولة " + next.round : ""}</small></div></div>
      ${theirs.length ? `<div class="ds-grid">${theirs.map(card).join("")}</div>` : `<p class="ds-hint">${safe(P.awayNone)}</p>`}
      ${ours.length ? `<div class="ds-h"><b>${safe(P.ours)}</b><span>${safe(P.oursEn)}</span></div><div class="ds-grid">${ours.map(card).join("")}</div>` : ""}`;
    }
  }

  box.innerHTML = html;

  // في الجوال: الضغط يقلب البطاقة
  box.addEventListener("click", e => {
    const c = e.target.closest(".dc");
    if (c && !e.target.closest("a")) c.classList.toggle("dc-on");
  });
})();
