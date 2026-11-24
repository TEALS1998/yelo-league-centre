/* حالات طرد في دوري الأولى ما صدر فيها قرار منشور من لجنة الانضباط والأخلاق
   تُضاف يدويًا من تقارير المباريات الصحفية، مع رابط المصدر.
   أول ما ينشر الاتحاد قرارًا للاعب نفسه في نفس المباراة، تختفي الحالة من هنا تلقائيًا وتظهر بطاقة القرار مكانها.
   date = تاريخ المباراة · min = دقيقة الطرد · why = سبب الطرد كما ورد في الخبر */
window.DISCIPLINE_PENDING = [
  { person: "بندر وحيشي", club: "الوحدة", match: { home: "الجندل", away: "الوحدة", date: "2026-09-20" }, round: 6, min: "45", why: "طرد",
    src: "https://halalkhalij.com/sports/252920", srcName: "حال الخليج" },
  { person: "بكاري", club: "هجر", match: { home: "هجر", away: "العلا", date: "2026-11-01" }, round: 10, min: "35", why: "طرد",
    src: "https://halalkhalij.com/sports/260970", srcName: "حال الخليج" },
  { person: "محمد الظفيري", club: "جدة", match: { home: "جدة", away: "ضمك", date: "2026-11-23" }, round: 12, min: "90+11", why: "طرد بسبب اشتباك",
    src: "https://arriyadiyah.com/905462", srcName: "الرياضية" },
  { person: "عبد القادر بدران", club: "ضمك", match: { home: "جدة", away: "ضمك", date: "2026-11-23" }, round: 12, min: "90+11", why: "طرد بسبب اشتباك",
    src: "https://arriyadiyah.com/905462", srcName: "الرياضية" }
];
