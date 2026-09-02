/* 정해진 시각에 어른께 전화(또는 문자)를 겁니다.
   5분마다 깨어나서 "지금 나갈 것"만 집어갑니다.

   ── 왜 서버가 문장을 다시 만들지 않는가 ─────────────
   앱이 전날 밤에 만들어 state.callOutbox 에 넣어둔 것을 그대로 보냅니다.
   서버가 다시 만들면 부모가 미리보기에서 본 문장과 달라질 수 있고,
   그러면 "내가 본 게 안 나갔다"가 됩니다. 그건 이 앱이 죽는 길입니다.
   부모가 본 그 문장이 그대로 나가야 합니다.

   ── 왜 같은 통을 두 번 안 거는가 ────────────────────
   보낸 것은 voice_sent 에 적습니다. state 를 서버가 고쳐 쓰면
   부모가 그 순간 화면에서 고치던 것과 부딪칩니다.

   ⚠ 여기서만 service_role 을 씁니다 — 모든 가구를 읽어야 하니까요.
      브라우저에는 절대 안 내려갑니다. push-send.js 와 같은 방식입니다.
   ⚠ 브라우저에서 못 부릅니다. CRON_SECRET 으로 막습니다.

   ── 누가 5분마다 깨우는가 ───────────────────────────
   vercel.json 에는 넣지 않았습니다. Hobby 요금제는 크론이 하루 한 번뿐이라
   분 단위 크론을 적어두면 배포 자체가 실패합니다 — 그렇게 여덟 판을 날렸습니다.

   그래서 바깥에서 부릅니다. 무료 스케줄러(cron-job.org 등)에
     주소 : https://<배포주소>/api/voice-send
     주기 : 5분
     헤더 : Authorization: Bearer <CRON_SECRET>
   Vercel Pro 로 올리면 vercel.json 의 crons 로 되돌려도 됩니다.
*/
import crypto from "crypto";
import webpush from "web-push";

const SOLAPI = "https://api.solapi.com";
const KST = 9 * 60;                    /* 한국은 UTC+9 */

/* 지금이 한국 시간으로 몇 시 몇 분인지, 그리고 오늘이 며칠인지 */
function nowKST() {
  const d = new Date(Date.now() + KST * 60000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return { day: d.toISOString().slice(0, 10), hhmm: `${hh}:${mm}`, min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function authHeader(key, secret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function solapi(path, key, secret, method = "GET", body) {
  const r = await fetch(SOLAPI + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: authHeader(key, secret) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

async function sb(url, service, path, method = "GET", body) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: service, Authorization: `Bearer ${service}`,
      "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === "GET") return r.json().catch(() => []);
  return { ok: r.ok, status: r.status, text: r.ok ? "" : await r.text().catch(() => "") };
}

export default async function handler(req, res) {
  const cron = String(process.env.CRON_SECRET || "").trim();
  const given = String(req.headers.authorization || "").replace(/^Bearer /, "").trim();
  if (!cron) return res.status(500).json({ error: "CRON_SECRET 이 없습니다" });
  if (given !== cron) return res.status(401).json({ error: "인증" });

  const url = String(process.env.SUPABASE_URL || "").trim();
  const service = String(process.env.SUPABASE_SERVICE_KEY || "").trim();
  const key = String(process.env.SOLAPI_API_KEY || "").trim();
  const secret = String(process.env.SOLAPI_API_SECRET || "").trim();
  const from = String(process.env.SOLAPI_FROM || "").trim();
  if (!url || !service) return res.status(500).json({ error: "SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없습니다" });
  if (!key || !secret || !from) return res.status(500).json({ error: "SOLAPI_API_KEY / SECRET / FROM 이 없습니다" });

  /* 정말 보낼지. 붙이고 나서 처음에는 dry=1 로 돌려 무엇이 나갈지만 봅니다 */
  const dry = String(req.query.dry || "") === "1";

  const { day, min } = nowKST();
  /* 5분마다 도니 5분 창을 봅니다. 앞으로 조금 여유를 둬서
     한 번 걸러도 다음 회차에 나가게 합니다 — 늦는 건 괜찮고 빠진 건 안 됩니다. */
  const WINDOW = 12;

  const rows = await sb(url, service, "households?select=id,code,state");
  const 보낼것 = [];
  const 미리알릴집 = [];   /* 부모에게 "확인하세요" — 전날 저녁(내일 것)과 아침(오늘 것) */
  const tomorrow = new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10);
  /* 앱과 같은 규칙: 빈 문자열이면 끔, 값이 없으면 기본, 예전 callHeadsUp=false 면 끔 */
  const headsAt = (st, k, def) => {
    const x = st[k];
    if (x === "") return null;
    if (x == null && st.callHeadsUp === false) return null;
    return toMin(x) != null ? toMin(x) : toMin(def);
  };
  const due = (t) => t != null && t <= min && t > min - WINDOW;

  for (const h of Array.isArray(rows) ? rows : []) {
    const st = h.state || {};
    if (!st.callOn) continue;
    const elder = (st.elders || [])[0] || {};
    const to = String(elder.phone || "").replace(/[^0-9]/g, "");
    if (!to) continue;
    if (elder.how === "app") continue;          /* 앱으로 받으시는 집은 전화가 안 나갑니다 */

    const box = ((st.callOutbox || {})[day] || []);

    /* ── 나가기 전에 부모에게 한 번 ────────────────────
       전날 미리보기에서 이미 보셨지만, 아침에 사정이 바뀝니다.
       첫 통 10분 전에 알려서 아직 안 나간 통을 고칠 수 있게 합니다.
       한 통마다 알리지 않습니다 — 그러면 부모 일이 하루에 여섯 번 늡니다.
       끄신 집에는 안 갑니다. 꺼도 전화는 그대로 나갑니다. */
    /* 전에는 첫 통 10분 전 한 번이었습니다. 부모는 저녁에 내일 것을 훑고 아침에 한 번 더 봅니다.
       두 시각은 부모가 정합니다. 갈 것이 없는 날은 알리지 않습니다. */
    if (due(headsAt(st, "callHeadsMorn", "07:30")) && box.length) {
      미리알릴집.push({ hh: h.id, code: h.code, kind: "headsup-morn", at: box[0].at, n: box.length,
        title: "오늘 어른께 갈 말을 확인하세요", body: `오늘 ${box.length}건, 첫 통 ${box[0].at}. 바뀐 게 있으면 지금 고치세요.` });
    }
    const box2 = ((st.callOutbox || {})[tomorrow] || []);
    if (due(headsAt(st, "callHeadsEve", "20:00")) && box2.length) {
      미리알릴집.push({ hh: h.id, code: h.code, kind: "headsup-eve", at: box2[0].at, n: box2.length,
        title: "내일 어른께 갈 말을 확인하세요", body: `내일 ${box2.length}건, 첫 통 ${box2[0].at}. 부모님 탭에서 한 번 보세요.` });
    }

    for (const it of box) {
      const at = toMin(it.at);
      if (at == null) continue;
      if (at > min || at < min - WINDOW) continue;      /* 아직 이르거나, 너무 지났거나 */
      if (!String(it.text || "").trim()) continue;
      /* 앱 알림으로 고른 것은 전화도 문자도 아닙니다.
         부모 푸시와 같은 길로 가야 해서 여기서는 건너뜁니다. */
      if (it.app) continue;
      보낼것.push({ hh: h.id, code: h.code, to, it });
    }
  }

  /* 이미 보낸 것은 건너뜁니다. voice_sent 의 기본키가 (집, 날, 통) 이라
     설령 두 번 시도해도 두 번째 적기가 무시됩니다(ignore-duplicates). */
  const 보냄 = await sb(url, service, `voice_sent?select=household_id,item_id&day=eq.${day}`);
  const 이미 = new Set((Array.isArray(보냄) ? 보냄 : []).map((r) => `${r.household_id}|${r.item_id}`));
  const 할것 = 보낼것.filter((x) => !이미.has(`${x.hh}|${x.it.id}`));
  /* 확인 알림도 하루 한 번씩만. 5분마다 도는데 창이 12분이라 안 적어두면 두 번 울립니다 */
  const 알릴것 = 미리알릴집.filter((g) => !이미.has(`${g.hh}|${g.kind}`));

  if (dry) {
    return res.status(200).json({
      지금: `${day} ${nowKST().hhmm} (한국)`, 집: rows.length,
      나갈것: 할것.map((x) => ({ 집: x.code, 시각: x.it.at, 길: x.it.sms ? "문자" : "전화", 말: x.it.text })),
      미리알릴집: 알릴것.map((g) => `${g.code} ${g.kind}`),
    });
  }

  /* 미리 알림 먼저. 이게 늦으면 알리는 뜻이 없습니다 */
  const 알림 = [];
  const pub = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const priv = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const mail = String(process.env.VAPID_SUBJECT || "mailto:hello@example.com").trim();
  if (알릴것.length && pub && priv) {
    webpush.setVapidDetails(mail, pub, priv);
    for (const g of 알릴것) {
      const subs = await sb(url, service, `push_subs?select=endpoint,p256dh,auth&household_id=eq.${g.hh}`);
      for (const sbx of Array.isArray(subs) ? subs : []) {
        try {
          await webpush.sendNotification(
            { endpoint: sbx.endpoint, keys: { p256dh: sbx.p256dh, auth: sbx.auth } },
            JSON.stringify({ title: g.title, body: g.body })
          );
          알림.push(`${g.code} ${g.kind}`);
        } catch { /* 구독이 죽었을 수 있습니다. 전화는 그대로 나가야 하니 넘어갑니다 */ }
      }
      /* 보냈다고 적어둡니다 — 같은 날 같은 알림은 다시 안 갑니다 */
      await sb(url, service, "voice_sent", "POST", [{ household_id: g.hh, day, item_id: g.kind, at: nowKST().hhmm, sms: false, ok: true }]);
    }
  }

  const 결과 = [];
  for (const x of 할것) {
    const msg = x.it.sms
      ? { to: x.to, from, text: x.it.text, type: "SMS" }
      : { to: x.to, from, text: x.it.text, type: "VOICE", voiceOptions: { voiceType: "FEMALE" } };
    let ok = false, err = "";
    try {
      const r = await solapi("/messages/v4/send", key, secret, "POST", { message: msg });
      ok = r.status >= 200 && r.status < 300;
      if (!ok) err = JSON.stringify(r.data).slice(0, 300);
    } catch (e) { err = String((e && e.message) || e).slice(0, 300); }

    await sb(url, service, "voice_sent", "POST", [{
      household_id: x.hh, day, item_id: x.it.id, at: x.it.at, sms: !!x.it.sms, ok, err: err || null,
    }]);
    결과.push({ 집: x.code, 시각: x.it.at, 길: x.it.sms ? "문자" : "전화", ok, err: err || undefined });
  }

  console.log("voice-send", JSON.stringify({ day, min, n: 결과.length, 미리알림: 알림.length, 결과 }));
  return res.status(200).json({ 지금: `${day} ${nowKST().hhmm}`, 보냄: 결과.length, 미리알림: 알림, 결과 });
}
