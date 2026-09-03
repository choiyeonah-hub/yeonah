/* 알림 구독 등록·해제
   브라우저가 만들어준 구독 정보를 받아 가구에 붙여 둡니다.
   ⚠ 이 함수는 service_role 키를 쓰지 않습니다. 로그인한 사용자의 토큰으로
      Supabase에 접근하므로 RLS가 그대로 지켜집니다. */

const SB = () => ({ url: (process.env.SUPABASE_URL || "").trim(), anon: (process.env.SUPABASE_ANON_KEY || "").trim() });

/* 누가 보냈는지, 그 사람이 그 가구 사람인지 확인합니다 */
async function whoAndHousehold(req) {
  const { url, anon } = SB();
  if (!url || !anon) return { error: "서버에 Supabase 설정이 없어요" };
  const authz = String(req.headers.authorization || "");
  if (!authz.startsWith("Bearer ")) return { error: "로그인이 필요합니다" };
  const token = authz.slice(7).trim();
  if (!token || token.length > 4000) return { error: "로그인이 필요합니다" };

  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!u.ok) return { error: "로그인이 만료됐어요. 다시 들어와 주세요" };
  const user = await u.json();

  const m = await fetch(`${url}/rest/v1/household_members?select=household_id&user_id=eq.${user.id}`,
    { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  const rows = m.ok ? await m.json() : [];
  return { token, userId: user.id, households: rows.map((r) => r.household_id) };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const who = await whoAndHousehold(req);
  if (who.error) return res.status(401).json({ error: who.error });

  const { sub, householdId, hour, off } = req.body || {};
  /* 어른 폰이면 "elder". 서버는 어른께 가는 알림을 이 폰에만, 부모 알림은 나머지 폰에만 보냅니다 */
  const kind = String((req.body || {}).kind || "") === "elder" ? "elder" : "parent";
  if (!householdId || !who.households.includes(householdId)) {
    return res.status(403).json({ error: "이 가구의 알림은 설정할 수 없어요" });
  }
  const { url, anon } = SB();
  const H = { apikey: anon, Authorization: `Bearer ${who.token}`, "Content-Type": "application/json" };

  /* 끄기 — 이 사람의 구독만 지웁니다 */
  if (off) {
    await fetch(`${url}/rest/v1/push_subs?user_id=eq.${who.userId}`, { method: "DELETE", headers: H });
    return res.status(200).json({ ok: true, off: true });
  }

  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return res.status(400).json({ error: "구독 정보가 올바르지 않아요" });
  }
  /* 시각은 0~23만. 이상한 값이 들어오면 아침 8시로 */
  const h = Number.isInteger(Number(hour)) && Number(hour) >= 0 && Number(hour) <= 23 ? Number(hour) : 8;

  const r = await fetch(`${url}/rest/v1/push_subs?on_conflict=endpoint`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
      household_id: householdId, user_id: who.userId, hour: h, kind,
      /* 서버는 UTC로 돌기 때문에 몇 시간 차이인지 같이 받아둡니다 */
      tz_offset: Number(req.body.tzOffset) || 0,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("push_subs upsert failed", r.status, t.slice(0, 200));
    if (/kind/.test(t)) return res.status(500).json({ error: "서버 표(push_subs)에 kind 칸이 없어요. supabase-schema.sql 아래쪽 '어른 폰' 부분을 SQL Editor에서 한 번 실행해 주세요." });
    return res.status(500).json({ error: "알림 등록에 실패했어요. 잠시 뒤 다시 해주세요" });
  }
  return res.status(200).json({ ok: true, hour: h });
}
