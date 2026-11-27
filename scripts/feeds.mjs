// Match Centre · Author and rights holder: Tareem Alsaggaf · © 2026
// لوحة مركز المباريات · المؤلفة وصاحبة الحقوق: تريم إياد السقاف · © 2026
// Runs after league.mjs and discipline.mjs on every data run. For both leagues it writes:
//   site/feeds/<fdl|spl>/<saffId>.ics   calendar a club subscribes to once; it updates itself
//   site/feeds/<fdl|spl>/<saffId>.json  the club's matches, table row and changes, for club systems
//   site/feeds/<fdl|spl>/index.json     every club with the links above
// and sends a phone alert (ntfy.sh, free app) to each club's channel when one of its matches
// changes date, time, venue or status, or gets a result. Channel: <NTFY_PREFIX>-<league>-<saffId>.
// It also watches the updater itself: if SAFF has not been read for 45 minutes, the admin channel
// is told once, and told again when it recovers.
// Env: NTFY=0 sends nothing; DRY=1 prints instead of sending.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PREFIX = process.env.NTFY_PREFIX || "matchcentre-sa";
const SEND = process.env.NTFY !== "0";
const DRY = process.env.DRY === "1";
const STATE_DIR = path.join(ROOT, ".state");
const SITE_URL = process.env.SITE_URL || "https://teals1998.github.io/yelo-league-centre";
const MAX_ALERTS = 40;
const STALE_MIN = 45;
const log = (...a) => console.log("[feeds]", ...a);

const LEAGUES = [
  { key: "fdl", file: "data.js", last: "last-run.json", ar: "دوري الأولى", en: "First Division League", page: "" },
  { key: "spl", file: "data-spl.js", last: "last-run-spl.json", ar: "دوري روشن", en: "Saudi Pro League", page: "?league=spl" },
];

const DA = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MA = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const arDate = (date, time) => { if (!date) return "لم يُحدد"; const [y, m, d] = date.split("-").map(Number);
  return `${DA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MA[m - 1]}${time ? " " + time : ""}`; };

function load(file) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "site", file), "utf8"), ctx);
  return ctx.window.LEAGUE_DATA;
}
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const writeIfChanged = (f, s) => { if (fs.existsSync(f) && fs.readFileSync(f, "utf8") === s) return false; fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); return true; };
const venueName = (D, v) => v || "";            // Arabic name (the key SAFF uses)
const venueEn = (D, v) => (v && D.venues?.[v]?.[0]) || null;

// ---------- calendar ----------
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line) => { // RFC 5545: lines of at most 75 octets
  const out = []; let cur = "", len = 0;
  for (const ch of line) { const b = Buffer.byteLength(ch); if (len + b > 73) { out.push(cur); cur = " " + ch; len = 1 + b; } else { cur += ch; len += b; } }
  out.push(cur); return out.join("\r\n");
};
const utc = (date, time) => { // Riyadh is UTC+3 all year
  const [y, m, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 3, mi)).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; };
function ics(D, L, club, ms) {
  const stamp = (D.lastChecked || "2026-01-01").replace(/-/g, "") + "T000000Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Match Centre//AR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(club + " · " + L.ar)}`, "X-WR-TIMEZONE:Asia/Riyadh", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const m of ms) {
    if (!m.date) continue;
    const vs = m.home === club ? m.away : m.home, where = m.home === club ? "على أرضنا" : "خارج أرضنا";
    const comp = m.comp === "cup" ? "كأس خادم الحرمين الشريفين" : `${L.ar}${m.round ? " · الجولة " + m.round : ""}`;
    let title = `${m.home} × ${m.away}`;
    if (m.status === "played" && m.score) title = `${m.home} ${m.score[0]}–${m.score[1]} ${m.away}`;
    if (m.status === "postponed") title = "مؤجلة: " + title;
    const desc = [comp, `ضد ${vs} · ${where}`, m.status === "postponed" ? "الموعد الجديد لم يُحدد بعد" : "",
      ...(m.changes || []).slice(-3).map((c) => `تعديل ${c.at}: ${c.from?.[1] || ""} ← ${c.to?.[1] || ""}`)].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${m.id}-${L.key}@match-centre`, `DTSTAMP:${stamp}`, `SEQUENCE:${(m.changes || []).length}`);
    if (m.time && /^\d\d:\d\d$/.test(m.time)) { lines.push(`DTSTART:${utc(m.date, m.time)}`); const e = new Date(Date.parse(m.date + "T" + m.time + ":00+03:00") + 2 * 36e5);
      lines.push(`DTEND:${e.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`); }
    else { const n = new Date(Date.parse(m.date) + 864e5).toISOString().slice(0, 10).replace(/-/g, ""); lines.push(`DTSTART;VALUE=DATE:${m.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${n}`); }
    lines.push(`SUMMARY:${icsText(title)}`, `LOCATION:${icsText(venueName(D, m.venue))}`, `DESCRIPTION:${icsText(desc)}`,
      `STATUS:${m.status === "postponed" ? "TENTATIVE" : "CONFIRMED"}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ---------- alerts ----------
const sig = (m) => [m.date, m.time, m.venue, m.status, (m.score || []).join("-")].join("|");
function describe(D, m, p) {
  const [od, ot, ov, os] = p.split("|"), v = venueName(D, m.venue);
  if (m.status === "played" && os !== "played" && m.score) return { title: `النتيجة: ${m.home} ${m.score[0]}–${m.score[1]} ${m.away}`, body: arDate(m.date) };
  if (m.status === "postponed" && os !== "postponed") return { title: `تأجيل: ${m.home} × ${m.away}`, body: `كانت ${arDate(od, ot)} · الموعد الجديد لم يُحدد بعد` };
  if (os === "postponed" && m.status === "upcoming") return { title: `موعد جديد بعد التأجيل: ${m.home} × ${m.away}`, body: `${arDate(m.date, m.time)}${v ? " · " + v : ""}` };
  if (m.date !== od || m.time !== ot) return { title: `تعديل الموعد: ${m.home} × ${m.away}`, body: `من ${arDate(od, ot)} إلى ${arDate(m.date, m.time)}${v ? " · " + v : ""}` };
  if (m.venue !== ov) return { title: `تعديل الملعب: ${m.home} × ${m.away}`, body: `الملعب الجديد: ${v} · ${arDate(m.date, m.time)}` };
  if (m.status === "played" && m.score) return { title: `تصحيح النتيجة: ${m.home} ${m.score[0]}–${m.score[1]} ${m.away}`, body: arDate(m.date) };
  return null;
}
async function send(topic, title, message, click, tags = []) {
  if (!SEND) return;
  if (DRY) { log("ALERT", topic, "|", title, "|", message); return; }
  try {
    const r = await fetch("https://ntfy.sh/", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, title, message, click, tags, priority: 4 }) });
    if (!r.ok) log("alert refused", topic, r.status);
  } catch (e) { log("alert failed", topic, e.message); }
}

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const health = readJSON(path.join(STATE_DIR, "health.json"), {});
  let alerts = 0, healthChanged = false;
  for (const L of LEAGUES) {
    const D = load(L.file), S = D.seasons[D.current], dir = path.join(ROOT, "site", "feeds", L.key);
    const clubs = Object.entries(D.clubs || {}).filter(([, c]) => c.saffId);
    const index = { league: L.key, name: { ar: L.ar, en: L.en }, season: D.current, updated: D.lastChecked, clubs: [] };
    const rows = Object.fromEntries((S.table?.rows || []).map((r) => [r[0], Object.fromEntries((S.table.columns || []).map((c, i) => [c, r[i]]))]));
    let wrote = 0;
    for (const [club, c] of clubs) {
      const ms = S.matches.filter((m) => m.home === club || m.away === club);
      const base = `feeds/${L.key}/${c.saffId}`;
      if (writeIfChanged(path.join(dir, `${c.saffId}.ics`), ics(D, L, club, ms))) wrote++;
      const json = { club, en: D.teams?.[club] || null, league: L.key, season: D.current, updated: D.lastChecked, home: c.home || null, homeEn: venueEn(D, c.home), city: c.city || D.teamCities?.[club] || null,
        table: rows[club] || null,
        matches: ms.map((m) => ({ id: m.id, comp: m.comp, round: m.round ?? null, date: m.date || null, time: m.time || null, home: m.home, away: m.away,
          venue: venueName(D, m.venue) || null, venueEn: venueEn(D, m.venue), status: m.status, score: m.score || null, changes: (m.changes || []).map((x) => ({ field: x.field, from: x.from?.[1], to: x.to?.[1], at: x.at })) })) };
      if (writeIfChanged(path.join(dir, `${c.saffId}.json`), JSON.stringify(json, null, 1) + "\n")) wrote++;
      index.clubs.push({ club, en: D.teams?.[club] || null, id: String(c.saffId), calendar: `${SITE_URL}/${base}.ics`, data: `${SITE_URL}/${base}.json`,
        alerts: `https://ntfy.sh/${PREFIX}-${L.key}-${c.saffId}` });
    }
    writeIfChanged(path.join(dir, "index.json"), JSON.stringify(index, null, 1) + "\n");
    log(L.key, "clubs:", clubs.length, "files changed:", wrote);

    // alerts: compare every match with what the last run saw
    const stateFile = path.join(STATE_DIR, `alerts-${L.key}.json`), prev = readJSON(stateFile, null), now = {};
    for (const m of S.matches) now[m.id] = sig(m);
    if (prev) {
      const newBy = {};
      for (const m of S.matches) {
        if (!(m.id in prev)) { for (const t of [m.home, m.away]) newBy[t] = (newBy[t] || 0) + 1; continue; }
        if (prev[m.id] === now[m.id]) continue;
        const d = describe(D, m, prev[m.id]); if (!d) continue;
        for (const t of [m.home, m.away]) {
          const id = D.clubs?.[t]?.saffId; if (!id || alerts >= MAX_ALERTS) continue;
          await send(`${PREFIX}-${L.key}-${id}`, d.title, `${d.body}\n${L.ar}`, `${SITE_URL}/${L.page}`, ["soccer"]); alerts++;
        }
      }
      for (const [t, n] of Object.entries(newBy)) {
        const id = D.clubs?.[t]?.saffId; if (!id || alerts >= MAX_ALERTS) continue;
        await send(`${PREFIX}-${L.key}-${id}`, `${n === 1 ? "مباراة جديدة" : n + " مباريات جديدة"} في جدول ${t}`, `نشر الاتحاد مواعيد جديدة · ${L.ar}`, `${SITE_URL}/${L.page}`, ["calendar"]); alerts++;
      }
    }
    writeIfChanged(stateFile, JSON.stringify(now) + "\n");

    // watch the updater: the last successful SAFF read for this league
    const at = Date.parse(readJSON(path.join(ROOT, L.last), {}).at || 0), age = (Date.now() - at) / 6e4, ok = age <= STALE_MIN;
    const was = health[L.key]?.ok ?? true;
    if (ok !== was) {
      healthChanged = true;
      await send(`${PREFIX}-admin`, ok ? `عاد التحديث: ${L.ar}` : `توقف التحديث: ${L.ar}`,
        ok ? "اللوحة تقرأ موقع الاتحاد من جديد." : `لم تُقرأ صفحات الاتحاد منذ ${Math.round(age)} دقيقة. راجعي سجل GitHub Actions، أو صحّحي المباريات يدويًا من ملف overrides.json.`,
        `${SITE_URL}/${L.page}`, [ok ? "white_check_mark" : "warning"]);
    }
    health[L.key] = { ok, lastRead: at ? new Date(at).toISOString() : null };
  }
  if (healthChanged || !fs.existsSync(path.join(STATE_DIR, "health.json"))) writeIfChanged(path.join(STATE_DIR, "health.json"), JSON.stringify(health, null, 1) + "\n");
  log("alerts sent:", alerts);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
