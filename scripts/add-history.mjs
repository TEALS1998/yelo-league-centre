// One-off: add the schedule changes since the season start (21 Aug 2026) for every club,
// researched from SAFF, the league's original first-half schedule and press reports.
// Each entry keeps its source in "src".
// Author: Tareem Alsaggaf (تريم إياد السقاف), written with Claude.
import fs from "node:fs";

const FILE = new URL("../site/data.js", import.meta.url);
const txt = fs.readFileSync(FILE, "utf8");
const i = txt.indexOf("window.LEAGUE_DATA = ");
const header = txt.slice(0, i);
const D = JSON.parse(txt.slice(i + "window.LEAGUE_DATA = ".length).replace(/;\s*$/, ""));
const S = D.seasons[D.current];

const find = (home, away, round) => {
  const m = S.matches.find(x => x.comp === "league" && x.home === home && x.away === away && (round == null || x.round === round));
  if (!m) throw new Error(`not found ${home} v ${away}`);
  return m;
};
const PP = ["Postponed", "مؤجلة"];
const NEWD = ["New date not announced", "لم يُعلن موعد جديد"];
const add = (m, list) => {
  m.changes ||= [];
  for (const c of list) {
    const dup = m.changes.some(x => x.field === c.field && JSON.stringify(x.to) === JSON.stringify(c.to) && JSON.stringify(x.from) === JSON.stringify(c.from));
    if (!dup) m.changes.push(c);
  }
};

const SRC = {
  madina_hajer: "al-madina.com/article/1009184 · al-jazirah.com 14 Oct 2026",
  kas_jeel: "al-kas.com/167889 · sabq.org/article/hh5pvyd",
  anwar: "annahar-news.com/news/single/39080 · sabq.org/article/ktvnnp1 · akhbarperss.com/507743-2",
  adalah: "saff.com.sa/team.php?id=147 · al-kas.com/169080 · makkahnews.sa/5528354",
  madina_okh: "al-madina.com/article/1008629",
  derbies: "al-kas.com/163506 · al-madina.com/ampArticle/1000918 (original schedule, Aug 2026)",
  okh_orig: "goal.com original fixture list · ysscores.com/ar/match/24655993",
  okh_orig4: "goal.com original fixture list · ysscores.com/ar/match/43958175",
  saff: "saff.com.sa/championship.php?id=416",
  kas_ula: "al-kas.com/167395 · ysscores.com (AlUla postponed matches)",
};

// Round 7: Hajer v Al Orobah
add(find("هجر", "العروبة", 7), [
  { field: "status", from: ["Wed 14 Oct 2026 17:55, Hajer Club Stadium", "الأربعاء 14 أكتوبر 17:55، ملعب نادي هجر"], to: [PP[0] + " · new date not announced", PP[1] + " · لم يُعلن موعد جديد"], at: "2026-10-13",
    src: SRC.madina_hajer },
  { field: "date", from: NEWD, to: ["Fri 11 Dec 2026 17:35", "الجمعة 11 ديسمبر 17:35"], src: SRC.saff },
  { field: "venue", from: ["Hajer Club Stadium (Al Ahsa)", "ملعب نادي هجر (الأحساء)"], to: ["Prince Abdullah bin Jalawi Sports City (Al Ahsa)", "ملعب مدينة الأمير عبدالله بن جلوي الرياضية (الأحساء)"], src: SRC.saff },
]);

// Round 8: Al Jeel v Al Jandal
add(find("الجيل", "الجندل", 8), [
  { field: "status", from: ["Wed 21 Oct 2026 17:45", "الأربعاء 21 أكتوبر 17:45"], to: [PP[0] + " on match day · new date not announced", PP[1] + " يوم المباراة · لم يُعلن موعد جديد"], at: "2026-10-21",
    src: SRC.kas_jeel },
  { field: "date", from: NEWD, to: ["Sun 10 Jan 2027 15:10", "الأحد 10 يناير 15:10"], src: SRC.saff },
]);

// Round 9: Al Anwar v Al Akhdoud
add(find("الأنوار", "الأخدود", 9), [
  { field: "status", from: ["Mon 26 Oct 2026, Al Anwar Club Stadium", "الاثنين 26 أكتوبر، ملعب نادي الأنوار"], to: [PP[0] + " · new date not announced", PP[1] + " · لم يُعلن موعد جديد"], at: "2026-10-26",
    src: SRC.anwar },
  { field: "date", from: NEWD, to: ["Fri 11 Dec 2026 15:10", "الجمعة 11 ديسمبر 15:10"], src: SRC.saff },
]);

// Round 11: Al Adalah v Al Orobah
add(find("العدالة", "العروبة", 11), [
  { field: "status", from: ["Fri 6 Nov 2026 17:35, Hajer Club Stadium", "الجمعة 6 نوفمبر 17:35، ملعب نادي هجر"], to: [PP[0], PP[1]], at: "2026-11-06",
    src: SRC.adalah },
  { field: "date", from: ["Fri 6 Nov 2026 17:35", "الجمعة 6 نوفمبر 17:35"], to: ["Wed 18 Nov 2026 17:30", "الأربعاء 18 نوفمبر 17:30"], at: "2026-11-08", src: SRC.adalah },
]);

// Round 8: Al Akhdoud v Al Adalah, moved from Taif to Jeddah
add(find("الأخدود", "العدالة", 8), [
  { field: "venue", from: ["King Fahd Sports City Stadium (Taif)", "استاد مدينة الملك فهد الرياضية (الطائف)"], to: ["Jeddah Club Stadium (Jeddah)", "ملعب نادي جدة (جدة)"], at: "2026-10-09",
    src: SRC.madina_okh },
]);

// Round 15 derbies: original dates in the first-half schedule published in July/August
add(find("الجندل", "العروبة", 15), [
  { field: "date", from: ["Fri 11 Dec 2026 15:25", "الجمعة 11 ديسمبر 15:25"], to: ["Wed 16 Dec 2026 15:25", "الأربعاء 16 ديسمبر 15:25"], src: SRC.derbies },
  { field: "venue", from: ["Al Orobah Club Stadium (Al Jouf)", "ملعب نادي العروبة (الجوف)"], to: ["Al Jouf University Stadium (Al Jouf)", "استاد جامعة الجوف (الجوف)"], src: SRC.derbies },
]);
add(find("العدالة", "هجر", 15), [
  { field: "date", from: ["Sat 12 Dec 2026 17:30", "السبت 12 ديسمبر 17:30"], to: ["Wed 16 Dec 2026 17:30", "الأربعاء 16 ديسمبر 17:30"], src: SRC.derbies },
]);

// Round 2 and 4: Al Akhdoud were first scheduled at home in Najran
add(find("البكيرية", "الأخدود", 2), [
  { field: "venue", from: ["Prince Hathloul bin Abdulaziz Sports City (Najran), Al Akhdoud at home", "مدينة الأمير هذلول بن عبدالعزيز الرياضية (نجران)، الأخدود مستضيفًا"], to: ["Al Bukayriyah Club Stadium (Al Bukayriyah)", "ملعب نادي البكيرية (البكيرية)"], src: SRC.okh_orig },
  { field: "time", from: ["20:50", "20:50"], to: ["19:10", "19:10"], src: SRC.okh_orig },
]);
add(find("الأخدود", "النجمة", 4), [
  { field: "venue", from: ["Prince Hathloul bin Abdulaziz Sports City (Najran)", "مدينة الأمير هذلول بن عبدالعزيز الرياضية (نجران)"], to: ["Prince Sultan bin Abdulaziz Sports City (Abha)", "مدينة الأمير سلطان بن عبدالعزيز الرياضية (أبها)"], src: SRC.okh_orig4 },
]);

// AlUla v Al Jeel: the original date was Tuesday 13 October, not Monday 12
const ul = find("العلا", "الجيل", 7);
for (const c of ul.changes || []) {
  if (Array.isArray(c.from) && c.from[0] === "Mon 12 Oct 2026") { c.from = ["Tue 13 Oct 2026", "الثلاثاء 13 أكتوبر"]; c.at ||= "2026-10-13"; c.src = SRC.kas_ula; }
}
if (ul.orig === "2026-10-12") ul.orig = "2026-10-13";

fs.writeFileSync(FILE, header + "window.LEAGUE_DATA = " + JSON.stringify(D, null, 1) + ";\n");
let n = 0, clubs = new Set();
for (const m of S.matches) for (const c of m.changes || []) { n++; clubs.add(m.home); clubs.add(m.away); }
console.log("changes:", n, "matches with changes:", S.matches.filter(m => (m.changes || []).length).length, "clubs involved:", clubs.size);
