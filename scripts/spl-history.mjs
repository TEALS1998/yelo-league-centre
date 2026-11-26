// One-off: record the Roshn league schedule changes that happened before this site began tracking the league (24 Nov 2026).
// Each entry comes from an official Saudi Pro League announcement or its press coverage; sources are kept on every entry.
// Safe to run twice: entries tagged "spl-history" are not added again.
import fs from "node:fs";
const FILE = new URL("../site/data-spl.js", import.meta.url);
const src = fs.readFileSync(FILE, "utf8"), header = src.slice(0, src.indexOf("window.LEAGUE_DATA"));
const W = {}; new Function("window", src)(W); const D = W.LEAGUE_DATA, S = D.seasons[D.current];

const DE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], DA = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], MA = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const wd = d => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); };
const LAB = (d, t) => { const [y, m, dd] = d.split("-").map(Number); return [`${DE[wd(d)]} ${dd} ${ME[m - 1]} ${y}${t ? " " + t : ""}`, `${DA[wd(d)]} ${dd} ${MA[m - 1]}${t ? " " + t : ""}`]; };
const WIN = (r, a, b) => { const [, m1, d1] = a.split("-").map(Number), [y, m2, d2] = b.split("-").map(Number);
  return [`Round ${r} weekend, ${DE[wd(a)]} ${d1}${m1 !== m2 ? " " + ME[m1 - 1] : ""} to ${DE[wd(b)]} ${d2} ${ME[m2 - 1]} ${y}`, `الجولة ${r}، من ${DA[wd(a)]} ${d1}${m1 !== m2 ? " " + MA[m1 - 1] : ""} إلى ${DA[wd(b)]} ${d2} ${MA[m2 - 1]}`]; };
const VEN = v => [((D.venues || {})[v] || [v])[0], v];
const TAG = "spl-history";
const find = (h, a) => { const m = S.matches.find(x => x.comp === "league" && x.home === h && x.away === a); if (!m) throw new Error("no match " + h + " v " + a); return m; };
let n = 0;
const add = (m, c) => { m.changes ||= []; if (m.changes.some(x => x.tag === TAG && x.field === c.field && JSON.stringify(x.from) === JSON.stringify(c.from))) return; m.changes.push({ ...c, tag: TAG }); n++; };
const SRC = {
  aug23: "spl.com.sa/news/spl-reschedules-three-rounds-to-support-national-team-s-gulf-cup-preps (23 Aug 2026)",
  oct13: "SPL statement 13 Oct 2026 · sabq.org/article/eg440jm · arabnews.com/saudi-pro-league/saudi-pro-league-reschedules-three-fixtures-3006220",
  nov09: "spl.com.sa/en/news/rsl-schedule-2026-27 (9 Nov 2026)",
  nov03: "SPL statement 3 Nov 2026 · gate.ahram.org.eg/News/5977259.aspx",
  abhaFais: "okaz.com.sa/sport/saudi/2270328",
  abhaKhol: "sabq.org/article/9wbqp6j · okaz.com.sa/sport/na/2271313",
  ahliKhal: "kooora.com (22 Oct 2026) · news.jkn.co.kr/editions/arabic/post/1042922",
  nov05: "alweeam.com.sa/1300074",
};
// Rounds 8, 9 and 10 moved for the national team's Gulf Cup preparation (announced 23 Aug, before kick-off times were set)
for (const [r, a0, a1, b0, b1] of [[8, "2026-09-17", "2026-09-19", "2026-10-09", "2026-10-11"], [9, "2026-10-09", "2026-10-11", "2026-10-15", "2026-10-17"], [10, "2026-10-15", "2026-10-17", "2026-10-18", "2026-10-20"]])
  for (const m of S.matches.filter(x => x.comp === "league" && x.round === r)) add(m, { field: "date", from: WIN(r, a0, a1), to: WIN(r, b0, b1), at: "2026-08-23", src: SRC.aug23 });
// Abha v Al Faisaly, round 8: Sun 11 Oct to Tue 27 Oct
add(find("أبها", "الفيصلي"), { field: "date", from: LAB("2026-10-11"), to: LAB("2026-10-27", "15:40"), at: "2026-10-11", src: SRC.abhaFais });
// Round 9: three matches pushed back on 13 Oct, then set again on 9 Nov
for (const [h, a] of [["الرياض", "الهلال"], ["الاتحاد", "الشباب"]]) { const m = find(h, a);
  add(m, { field: "date", from: WIN(9, "2026-10-15", "2026-10-17"), to: LAB("2026-12-19"), at: "2026-10-13", src: SRC.oct13 });
  add(m, { field: "date", from: LAB("2026-12-19"), to: LAB(m.date, m.time), at: "2026-11-09", src: SRC.nov09 }); }
{ const m = find("الأهلي", "النصر");
  add(m, { field: "date", from: WIN(9, "2026-10-15", "2026-10-17"), to: LAB("2027-03-06"), at: "2026-10-13", src: SRC.oct13 });
  add(m, { field: "date", from: LAB("2027-03-06"), to: LAB(m.date, m.time), at: "2026-11-09", src: SRC.nov09 }); }
// Abha v Al Kholood, round 10: Mon 19 Oct to Mon 7 Dec (clash with Damac v Al Taee at the same ground)
add(find("أبها", "الخلود"), { field: "date", from: LAB("2026-10-19"), to: LAB("2026-12-07", "16:40"), at: "2026-10-18", src: SRC.abhaKhol });
// Al Ahli v Al Khaleej, round 11: put back a day, Al Khaleej could not fly out of Dammam
add(find("الأهلي", "الخليج"), { field: "date", from: LAB("2026-10-22"), to: LAB("2026-10-23", "21:00"), at: "2026-10-22", src: SRC.ahliKhal });
// Round 13: postponed in full on 3 Nov (Asian Cup moved), new dates on 9 Nov
const thu5 = new Set(["الخلود|الخليج", "أبها|الشباب", "القادسية|الفيحاء"]);
for (const m of S.matches.filter(x => x.comp === "league" && x.round === 13))
  add(m, { field: "date", from: thu5.has(m.home + "|" + m.away) ? LAB("2026-11-05") : WIN(13, "2026-11-05", "2026-11-07"), to: LAB(m.date, m.time), at: "2026-11-09",
    note: ["Round 13 was postponed on 3 Nov after the Asian Cup was moved", "تأجلت الجولة 13 كاملة في 3 نوفمبر بعد تأجيل كأس آسيا"], src: SRC.nov03 + " · " + SRC.nov09 + (thu5.has(m.home + "|" + m.away) ? " · " + SRC.nov05 : "") });
// Four matches moved to Buraydah for pitch maintenance (announced 9 Nov)
for (const [h, a, from] of [["الفيصلي", "الدرعية", "مدينة المجمعة الرياضية (المجمعة)"], ["الفيحاء", "الفتح", "مدينة المجمعة الرياضية (المجمعة)"], ["الحزم", "النصر", "ملعب نادي الحزم (الرس)"], ["الخلود", "الخليج", "ملعب نادي الحزم (الرس)"]]) {
  const m = find(h, a); add(m, { field: "venue", from: VEN(from), to: VEN(m.venue), at: "2026-11-09", src: SRC.nov09 }); }

const out = header + "window.LEAGUE_DATA = " + JSON.stringify(D, null, 1) + ";\n";
const chk = {}; new Function("window", out)(chk); if (!chk.LEAGUE_DATA.seasons[D.current].matches.length) throw new Error("broken");
fs.writeFileSync(FILE, out);
console.log("added", n, "changes to", S.matches.filter(m => (m.changes || []).some(c => c.tag === TAG)).length, "matches");
