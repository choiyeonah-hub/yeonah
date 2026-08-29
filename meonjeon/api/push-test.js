/* "지금 테스트 알림 보내기"
   켜졌다고 뜨는 것과 실제로 오는 것은 다릅니다. 내일 아침까지 기다렸다가
   안 오면 하루를 버립니다. 그 자리에서 확인할 수 있게 합니다.

   ⚠ service_role을 쓰지 않습니다. 로그인한 본인의 토큰으로 읽으므로
      RLS가 그대로 지켜지고, 자기 자신에게만 보낼 수 있습니다. */
import webpush from "web-push";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const url = String(process.env.SUPABASE_URL || "").trim();
  const anon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  const pub = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const priv = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const mail = String(process.env.VAPID_SUBJECT || "mailto:noreply@meonjeon.app").trim();
  if (!url || !anon) return res.status(500).json({ error: "서버에 Supabase 설정이 없어요" });
  if (!pub || !priv) return res.status(500).json({ error: "서버에 알림 키가 아직 없어요 (VAPID)" });

  const authz = String(req.headers.authorization || "");
  if (!authz.startsWith("Bearer ")) return res.status(401).json({ error: "로그인이 필요합니다" });
  const token = authz.slice(7).trim();
  if (!token || token.length > 4000) return res.status(401).json({ error: "로그인이 필요합니다" });

  const H = { apikey: anon, Authorization: `Bearer ${token}` };
  const u = await fetch(`${url}/auth/v1/user`, { headers: H });
  if (!u.ok) return res.status(401).json({ error: "로그인이 만료됐어요. 다시 들어와 주세요" });

  /* RLS가 본인 구독만 내어줍니다 */
  const r = await fetch(`${url}/rest/v1/push_subs?select=endpoint,p256dh,auth`, { headers: H });
  if (!r.ok) return res.status(500).json({ error: "구독을 못 읽었어요" });
  const subs = await r.json();
  if (!subs.length) {
    return res.status(200).json({ ok: false, error: "이 기기의 알림이 등록돼 있지 않아요. 알림 켜기를 한 번 더 눌러주세요" });
  }

  webpush.setVapidDetails(mail, pub, priv);
  const body = JSON.stringify({
    title: "먼저ON · 테스트",
    body: "잘 옵니다. 내일 아침 8시부터 그날 살펴둘 일을 보내드릴게요.",
  });

  let sent = 0, gone = 0, fail = null;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        gone++;
        await fetch(`${url}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
          { method: "DELETE", headers: H }).catch(() => {});
      } else {
        fail = `${(e && e.statusCode) || "?"} ${String((e && e.message) || "").slice(0, 80)}`;
      }
    }
  }
  if (sent) return res.status(200).json({ ok: true, sent, gone });
  return res.status(200).json({
    ok: false,
    error: gone
      ? "등록이 만료된 기기였어요. 알림을 껐다가 다시 켜주세요"
      : `보내지 못했어요${fail ? " (" + fail + ")" : ""}`,
  });
}
