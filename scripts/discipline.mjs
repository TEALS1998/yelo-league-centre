// First Division League Match Centre · Author and rights holder: Tareem Alsaggaf · © 2026
// مركز مباريات دوري الأولى · المؤلفة وصاحبة الحقوق: تريم إياد السقاف · © 2026
// Discipline record: reads the SAFF Discipline and Ethics Committee decisions for the current season
// and keeps the ones for the First Division League first team in site/discipline-data.js.
// Rules: never delete a decision already saved, and leave the file untouched when the pages look wrong.
import fs from "node:fs";
import path from "node:path";
import { loadData, teamMatcher } from "./league.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "site", "discipline-data.js");
const BASE = "https://www.saff.com.sa/";
const INDEX = BASE + "about.php?id=3&type=13&menu=4";
const log = (...a) => console.log("[discipline]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Bump when the reading rules change: every batch of the season is read again once.
const PARSER = 5;

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (First Division League match centre updater)", "accept-language": "ar,en;q=0.8" } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const utf = buf.toString("utf8"); // SAFF sometimes serves windows-1256 while declaring utf-8
  return /�/.test(utf.slice(0, 20000)) ? new TextDecoder("windows-1256").decode(buf) : utf;
}
const clean = (h) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
const digits = (s) => s.replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));

// Men's first team First Division League only (no age groups, women, futsal, other divisions).
export const isFdl = (comp) => /الدرجة الأولى للمحترفين|يلو للدرجة الأولى|دوري يلو/.test(comp) && !/تحت|سيدات|السيدات|الصالات|الشاطئية/.test(comp);

// The season's batches listed on the index page: [{ date, count }]
export function parseIndex(html) {
  const out = new Map();
  for (const m of html.matchAll(/mdate=(\d{4}-\d{2}-\d{2})#new"[^>]*>[^<]*<span[^>]*>\d{4}-\d{2}-\d{2}<\/span>[^<]*?\((\d+)\)/g)) out.set(m[1], +m[2]);
  return [...out].map(([date, count]) => ({ date, count }));
}

// Decision rows of the batch that the page shows in full (the one after <div id="new">).
export function parseBatch(html, teamOf, url) {
  const at = html.indexOf('<div id="new">');
  if (at < 0) return null;
  const end = html.indexOf("</table>", at);
  const table = html.slice(at, end < 0 ? undefined : end);
  if (!/منطوق القرار/.test(table)) return null;
  const rows = [];
  for (const tr of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const td = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => clean(m[1]));
    if (td.length < 6) continue;
    rows.push(toDecision(td, teamOf, url));
  }
  return rows;
}

export function toDecision(td, teamOf, url) {
  const [noDate, comp, matchTxt, against, violation, ruling] = td;
  const no = (noDate.split("\n")[0] || "").replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
  const date = (noDate.match(/\d{4}-\d{2}-\d{2}/) || [""])[0];
  const mm = matchTxt.split("\n");
  const [home, away] = (mm[0] || "").split(" - ").map((s) => teamOf(s.trim()) || s.trim());
  const mDate = (matchTxt.match(/\d{4}-\d{2}-\d{2}/) || [""])[0];
  // "لاعب نادي الطائي/ مهند حسين الحارثي" · "نادي العدالة" · "احتجاج نادي الزلفي" · "إداري نادي ..."
  const a = against.replace(/\s+/g, " ").trim();
  const rm = a.match(/^(.*?)\s*(?:بنادي|النادي|نادي)\s+(.*)$/);
  const roleTxt = rm ? rm[1].trim() : "";
  const after = rm ? rm[2] : a;
  const slash = after.indexOf("/");
  const clubTxt = (slash >= 0 ? after.slice(0, slash) : after).trim();
  const club = teamOf(clubTxt) || clubTxt;
  const person = slash >= 0 ? after.slice(slash + 1).trim() : "نادي " + clubTxt;
  const role = roleTxt || "نادي";
  // reason without the repeated name and the referee-report tail
  let reason = violation.replace(/\s+/g, " ").replace(/[،,]?\s*وذلك وفقاً? لما ورد في تقرير[^.]*\.?/g, "").trim();
  reason = reason.replace(new RegExp("^حصول\\s+" + a.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "\\s+على\\s+"), "").replace(/\.$/, "").trim();
  reason = reason.replace(/^حصول\s+(?:لاعب|إداري|مدرب)[^]*?\s+على\s+(?=البطاقة)/, "");
  reason = reason.replace(/\((\d+)\)\s*\S+/g, "$1").replace(/[،,]?\s*وفقا?ً? لما نصت[\s\S]*$/, "").replace(/[،,]?\s*ولم يقم[\s\S]*$/, "").trim();
  // "غياب مدرب نادي الأنوار/ عيسى المحياني عن المؤتمر" -> "غياب عن المؤتمر": the person is already on the card
  if (slash >= 0) reason = reason.split(a).join("").replace(/\s{2,}/g, " ").trim();
  if (/^البطاقة الحمراء/.test(reason)) reason = reason.replace(/^البطاقة الحمراء المباشرة/, "بطاقة حمراء مباشرة");
  const r = digits(ruling);
  const banM = r.match(/إيقاف[^()]{0,80}\((\d+)\)\s*\S*\s*مباري?ا?ة?ت?/);
  const ban = banM ? +banM[1] : /الإ?يقاف التلقائي|الايقاف التلقائي/.test(r) ? 1 : 0;
  const fineM = r.match(/غرامة مالية قدرها\s*\(([\d,]+)\)/);
  const fine = fineM ? +fineM[1].replace(/,/g, "") : 0;
  return { no, date, comp, match: { home, away, date: mDate }, person, role, club, reason, ban, fine, ruling, url, _raw: td };
}

const tidy = (d) => { const { comp, ruling, _raw, ...rest } = d; return { ...rest, appeal: /قابل للاستئناف/.test(ruling) && !/غير قابل للاستئناف/.test(ruling) }; };

function loadOut() {
  try { const w = {}; new Function("window", fs.readFileSync(OUT, "utf8"))(w); return w.DISCIPLINE; } catch { return null; }
}



// TEMPORARY probe of fdl.sa (removed after it runs)
async function probeFdl() {
  try {
    const j = await (await fetch("https://fdl.sa/js/app.js?id=9b18171208f018a5a855dfb533a4446e")).text();
    const around = (re, n) => [...j.matchAll(re)].slice(0, n).map((m) => j.slice(Math.max(0, m.index - 140), m.index + 220).replace(/\s+/g, " "));
    log("fdl sportsbase", JSON.stringify(around(/feeds\.sportsbase\.world/g, 6)));
    log("fdl apicalls", JSON.stringify(around(/\.(?:get|post)\(\s*["'`]/g, 60)).slice(0, 12000));
    log("fdl cards", JSON.stringify(around(/(?:yellow|red)_?[cC]ard|RedCard|YellowCard|cardType|card_type/g, 10)).slice(0, 4000));
  } catch (e) { log("fdl probe failed", e.message); }
}
async function main() {
  await probeFdl();
  const { D } = loadData();
  const teamOf = teamMatcher(D);
  // A decision is ours when SAFF labels it First Division League, or when SAFF leaves the competition
  // empty or names the King's Cup and the match is one of our clubs' first team matches this season.
  const S0 = D.seasons[D.current], SM = S0.matches;
  const findMatch = (d) => d.match.date && SM.find((m) => m.date === d.match.date && m.home === d.match.home && m.away === d.match.away);
  const ours = (d) => {
    if (isFdl(d.comp)) { d.kind = "league"; return true; }
    if (/تحت|سيدات|السيدات|الصالات|الشاطئية|روشن|الممتاز|الثانية|جوّي|جوي/.test(d.comp)) return false;
    const m = findMatch(d);
    if (!m) {
      // King's Cup ties we do not list (other rounds) still count when the club is one of ours
      if (/خادم الحرمين|كأس الملك/.test(d.comp) && D.teams[d.club] && S0.table.rows.some((r) => r[0] === d.club)) { d.kind = "cup"; return true; }
      return false;
    }
    d.kind = m.comp === "cup" ? "cup" : "league";
    return true;
  };
  const prev = loadOut() || { source: INDEX, batches: {}, decisions: [] };
  let html;
  try { html = await get(INDEX); } catch (e) { log("index failed:", e.message); return; }
  const batches = parseIndex(html);
  if (!batches.length) { log("no batches found on the index page; file left unchanged"); return; }
  if (prev.parser !== PARSER) { log("reading rules changed: every batch is read again"); prev.batches = {}; }
  const known = new Map(prev.decisions.map((d) => [d.no, d]));
  let added = 0, read = 0;
  for (const b of batches) {
    if (prev.batches[b.date] === b.count) continue;             // already read with the same number of decisions
    const url = `${INDEX}&mdate=${b.date}`;
    try {
      const page = await get(url + "#new");
      const rows = parseBatch(page, teamOf, url);
      if (!rows || rows.length !== b.count) { log("batch", b.date, "rows", rows && rows.length, "expected", b.count, "- skipped"); continue; }
      read++;
      const comps = {};
      for (const x of rows) comps[x.comp] = (comps[x.comp] || 0) + 1;
      log("batch", b.date, "rows", rows.length, "first division", rows.filter((x) => ours(x)).length, JSON.stringify(comps));
      for (const d of rows.filter((x) => ours(x))) {
        if (!known.has(d.no)) added++;
        known.set(d.no, tidy(d));
      }
      prev.batches[b.date] = b.count;
    } catch (e) { log("batch failed:", b.date, e.message); }
    await sleep(700);
  }
  // which league matches each suspension covers (worked out again every run, fixtures move)
  const S = D.seasons[D.current];
  const L = S.matches.filter((m) => m.comp === "league" && m.status !== "postponed").sort((x, y) => (x.date < y.date ? -1 : 1));
  for (const d of known.values()) {
    delete d.out;
    if (!d.ban || /^(نادي|احتجاج)$/.test(d.role) || !d.match.date) continue;
    const pool = d.kind === "cup" ? S.matches.filter((m) => m.comp === "cup" && m.status !== "postponed").sort((x, y) => (x.date < y.date ? -1 : 1)) : L;
    const next = pool.filter((m) => (m.home === d.club || m.away === d.club) && m.date > d.match.date).slice(0, d.ban);
    if (next.length) d.out = next.map((m) => ({ date: m.date, home: m.home, away: m.away, round: m.round || null }));
  }
  const decisions = [...known.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : parseInt(b.no) - parseInt(a.no)));
  const out = { source: INDEX, parser: PARSER, checked: new Date().toISOString().slice(0, 10), batches: prev.batches, decisions };
  const body = "/* سجل الانضباط: قرارات لجنة الانضباط والأخلاق في دوري الدرجة الأولى للمحترفين.\n   يحدّثه scripts/discipline.mjs تلقائياً من موقع الاتحاد السعودي لكرة القدم. */\nwindow.DISCIPLINE = " + JSON.stringify(out, null, 1) + ";\n";
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/"checked": "[^"]*",?\n?/, "") : "";
  if (before === body.replace(/"checked": "[^"]*",?\n?/, "")) { log("no changes"); return; }
  fs.writeFileSync(OUT, body);
  log(`batches read: ${read}, new decisions: ${added}, total: ${decisions.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname))
  main().catch((e) => { console.error(e); process.exitCode = 1; });
