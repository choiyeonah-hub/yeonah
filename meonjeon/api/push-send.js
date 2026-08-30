/* 매일 정해진 시각에 "오늘 살펴둘 일"을 보냅니다.
   Vercel Cron이 매시 정각에 부릅니다. 지금 시각이 그 집이 고른 시각인
   구독에만 보냅니다.

   ⚠ 여기서만 service_role을 씁니다 — 모든 가구를 읽어야 하니까요.
      이 함수는 브라우저에서 못 부릅니다(CRON_SECRET으로 막습니다).
      키는 Vercel 환경변수에만 있고 브라우저에는 절대 안 내려갑니다. */
import webpush from "web-push";

/* 알림에 담을 한 줄을 만듭니다. AI를 쓰지 않습니다 — 이미 있는 데이터로 조립합니다 */
const DAY = 86400000;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

function todayLine(state, tzOffset, userId) {
  const st = state || {};
  /* 그 집의 오늘 자정 (서버는 UTC라 시차를 더해서 봅니다) */
  const local = Date.now() + tzOffset * 60000;
  const today = startOfDay(local) - tzOffset * 60000;

  /* 누구에게 보내는 알림인지 알아냅니다.
     구성원마다 uid(로그인 계정)가 붙어 있고, 구독에도 user_id가 있습니다. */
  const meId = (st.members || []).find((m) => m && m.uid === userId)?.id || null;

  /* ⚠ 예전에는 집 안의 모든 할 일을 두 사람 폰에 똑같이 보냈습니다.
     그러면 남편에게 넘긴 일이 아내 폰에도 계속 울립니다.
     넘겼는데 내 화면에서 안 사라지면 내려놓은 게 아니고,
     결국 "그거 했어?"를 다시 사람이 말하게 됩니다 — 그게 잔소리 지점입니다.
     그래서 내 몫과 아직 임자 없는 일만 보냅니다. 남의 몫은 그 사람 폰에서 울립니다. */
  const mine = (t) => !meId || !t.owner || t.owner === meId;
  const tasks = (st.tasks || []).filter((t) => t && !t.done && mine(t));

  /* 오늘까지 온 것 + 지금 해야 하는 것. 살 것은 빼둡니다 — 급하지 않으니까요 */
  const now = tasks.filter((t) => t.status !== "buy" && ((t.dueAt || 0) <= today + DAY || t.status === "now"))
    .map((t) => String(t.title || "").trim()).filter(Boolean);

  /* 매일 하는 루틴 — 개 산책처럼 "매일인데 매일 까먹는" 것이 여기 있습니다.
     서버는 씨앗 목록을 모르므로 앱이 적어둔 routineTitles를 씁니다.
     오늘 이미 한 것(lastAt이 오늘)은 뺍니다. */
  const titles = st.routineTitles || {};
  const daily = [];
  for (const [key, cfg] of Object.entries(st.routines || {})) {
    if (!cfg || cfg.on === false) continue;
    /* 정기 일정도 담당이 정해졌으면 그 사람 폰에서만 울립니다 */
    if (meId && cfg.owner && cfg.owner !== meId) continue;
    const name = String(titles[key] || "").trim();
    if (!name) continue;                              /* 이름을 모르면 안 보냅니다 */
    if ((cfg.lastAt || 0) >= today) continue;         /* 오늘 이미 했음 */
    if ((cfg.nextAt || 0) >= today + DAY) continue;   /* 아직 날이 아님 */
    daily.push(name);
  }

  /* 매일 까먹는 것을 먼저, 그다음이 그날 잡힌 일입니다 */
  const all = [...new Set([...daily, ...now])];
  if (!all.length) return null;                       /* 없는 날은 안 보냅니다 */
  const shown = all.slice(0, 3).map((t) => t.slice(0, 24));
  const more = all.length - shown.length;
  return {
    title: `오늘 살펴둘 일 ${all.length}가지`,
    body: shown.join(" · ") + (more > 0 ? ` 외 ${more}개` : ""),
  };
}

export default async function handler(req, res) {
  /* Vercel Cron만 부를 수 있게 막습니다 */
  const secret = (process.env.CRON_SECRET || "").trim();
  const given = String(req.headers.authorization || "").replace(/^Bearer /, "");
  if (!secret || given !== secret) return res.status(401).json({ error: "unauthorized" });

  const url = (process.env.SUPABASE_URL || "").trim();
  const service = (process.env.SUPABASE_SERVICE_KEY || "").trim();
  const pub = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const mail = (process.env.VAPID_SUBJECT || "mailto:noreply@meonjeon.app").trim();
  if (!url || !service || !pub || !priv) {
    return res.status(500).json({ error: "알림 설정이 아직입니다 (SUPABASE_SERVICE_KEY / VAPID 키)" });
  }
  webpush.setVapidDetails(mail, pub, priv);

  const H = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  const subsRes = await fetch(`${url}/rest/v1/push_subs?select=*`, { headers: H });
  if (!subsRes.ok) return res.status(500).json({ error: "구독 목록을 못 읽었어요" });
  const subs = await subsRes.json();

  /* 지금이 그 집의 몇 시인지 보고, 고른 시각인 것만 고릅니다 */
  const utcH = new Date().getUTCHours();
  const due = subs.filter((s) => {
    const localH = (utcH + Math.round((Number(s.tz_offset) || 0) / 60) + 24) % 24;
    return localH === (Number(s.hour) || 8);
  });
  if (!due.length) return res.status(200).json({ ok: true, sent: 0, checked: subs.length });

  /* 필요한 가구만 한 번씩 읽습니다 */
  const ids = [...new Set(due.map((s) => s.household_id))];
  const hhRes = await fetch(`${url}/rest/v1/households?select=id,state&id=in.(${ids.join(",")})`, { headers: H });
  const hhs = hhRes.ok ? await hhRes.json() : [];
  const stateOf = Object.fromEntries(hhs.map((h) => [h.id, h.state]));

  let sent = 0, quiet = 0, gone = 0;
  for (const s of due) {
    const line = todayLine(stateOf[s.household_id], Number(s.tz_offset) || 0, s.user_id);
    if (!line) { quiet++; continue; }               /* 오늘 할 게 없으면 안 보냅니다 */
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(line)
      );
      sent++;
    } catch (e) {
      /* 404·410이면 그 구독은 죽은 겁니다. 지웁니다 */
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        gone++;
        await fetch(`${url}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE", headers: H }).catch(() => {});
      } else {
        console.error("push failed", e && e.statusCode, String((e && e.message) || "").slice(0, 120));
      }
    }
  }
  /* 내용은 로그에 안 남깁니다 — 할 일 제목은 개인정보입니다 */
  console.log("push run", { checked: subs.length, due: due.length, sent, quiet, gone });
  return res.status(200).json({ ok: true, sent, quiet, gone });
}
