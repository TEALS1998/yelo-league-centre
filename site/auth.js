/* Match Centre accounts: Supabase sign-in, the club an account belongs to, and what each role may see.
   The publishable key is public by design; row level security in supabase/schema.sql decides what anyone can read or change. */
(function () {
  const SB_URL = "https://rpbyogivtqwygcmldrkd.supabase.co";
  const SB_KEY = "sb_publishable_NcLTOGU-NjEdcOVBAvg98w_b0RSEO75";
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

  /* the six roles and what each can see, as in the clubs deck's roles table */
  const ROLES = {
    club_admin:       { ar: "مدير النادي",            en: "Club admin",            absences: true,  travel: true,  export: true,  users: true },
    football_manager: { ar: "مدير الكرة / الفريق",    en: "Football manager",      absences: true,  travel: true,  export: true,  users: false },
    coaching:         { ar: "الجهاز الفني والمحلل",   en: "Coaching staff",        absences: true,  travel: true,  export: true,  users: false },
    operations:       { ar: "العمليات والسفر",        en: "Operations",            absences: false, travel: true,  export: true,  users: false },
    media:            { ar: "المركز الإعلامي",        en: "Media",                 absences: false, travel: false, export: true,  users: false },
    board:            { ar: "عضو مجلس الإدارة",       en: "Board member",          absences: false, travel: false, export: false, users: false },
  };

  let client = null;
  const ready = new Promise((resolve, reject) => {
    const done = () => { try { client = window.supabase.createClient(SB_URL, SB_KEY); resolve(client); } catch (e) { reject(e); } };
    if (window.supabase && window.supabase.createClient) return done();
    const s = document.createElement("script"); s.src = LIB; s.async = true; s.onload = done; s.onerror = () => reject(new Error("could not load the sign-in library"));
    document.head.appendChild(s);
  });

  async function session() { const sb = await ready; const { data } = await sb.auth.getSession(); return data.session; }
  async function membership() {
    const s = await session(); if (!s) return null;
    const sb = await ready;
    const { data, error } = await sb.from("memberships").select("*").eq("user_id", s.user.id).maybeSingle();
    if (error) throw error; return data;
  }
  async function isPlatformAdmin() {
    const s = await session(); if (!s) return false;
    const sb = await ready; const { data } = await sb.rpc("is_platform_admin"); return !!data;
  }
  /* readable Arabic for the errors people actually meet */
  function arError(e) {
    const m = String((e && (e.message || e.error_description)) || e || "");
    if (/Invalid login credentials/i.test(m)) return "الإيميل أو كلمة المرور غير صحيحة.";
    if (/already registered|already been registered/i.test(m)) return "هذا الإيميل عنده حساب. سجّل الدخول بدل إنشاء حساب.";
    if (/Email not confirmed/i.test(m)) return "الحساب يحتاج تأكيد الإيميل. اطلب من مديرة المنصة إيقاف تأكيد الإيميل أو تأكيد حسابك.";
    if (/Password should be at least/i.test(m)) return "كلمة المرور قصيرة. استخدم 8 أحرف أو أكثر.";
    if (/invite code not found/i.test(m)) return "رمز الدعوة غير موجود أو مستخدم من قبل.";
    if (/made for another email/i.test(m)) return "هذا الرمز مصنوع لإيميل ثاني. سجّل بنفس الإيميل اللي انعزمت عليه.";
    if (/rate limit/i.test(m)) return "محاولات كثيرة. انتظر دقائق وحاول مرة ثانية.";
    if (/could not load/i.test(m)) return "تعذّر الاتصال بخدمة الحسابات. تأكد من الإنترنت وحدّث الصفحة.";
    return m || "صار خطأ غير متوقع.";
  }
  window.MC_AUTH = { ready, session, membership, isPlatformAdmin, ROLES, arError, SB_URL };
})();
