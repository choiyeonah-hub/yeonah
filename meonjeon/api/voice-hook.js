/* 솔라피가 발송 결과를 여기로 쏴줍니다 — 받으셨는지, 안 받으셨는지.
   어른은 아무것도 안 하십니다. 통신사가 알려주는 것이라
   전화를 받으셨다는 사실만으로 기록이 남습니다.

   솔라피 콘솔 → 개발 → Webhooks 에서 이 주소를 넣으세요.
     https://<도메인>/api/voice-hook?token=…
   그리고 Vercel 환경변수에 VOICE_HOOK_TOKEN 을 같은 값으로 넣습니다.

   ⚠ 토큰이 없으면 아무나 가짜 결과를 밀어 넣을 수 있습니다.
      그래서 토큰이 안 맞으면 401로 끊습니다.
   ⚠ 지금은 받아서 적어두기까지만 합니다. 부모에게 푸시를 보내려면
      "이 발신번호가 누구 집인지"를 아는 표가 하나 있어야 합니다. */

/* 솔라피가 어떤 이름으로 보내줄지 확실치 않아서 넓게 훑습니다.
   문서가 바뀌어도 안 깨지도록, 못 찾으면 통째로 남깁니다. */
function pick(o, keys) {
  for (const k of keys) {
    const v = k.split(".").reduce((a, p) => (a == null ? a : a[p]), o);
    if (v != null && v !== "") return v;
  }
  return null;
}

/* 받으셨나 — 솔라피 결과코드 2000이 정상 처리입니다.
   못 받으신 것과 실패한 것을 나누지 않습니다. 부모 입장에서는 같습니다. */
function answered(body) {
  const code = String(pick(body, ["statusCode", "status", "resultCode", "message.statusCode"]) || "");
  if (code === "2000" || code === "4000") return true;
  if (code) return false;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const token = String(process.env.VOICE_HOOK_TOKEN || "").trim();
  if (!token) return res.status(500).json({ error: "VOICE_HOOK_TOKEN 이 없습니다" });
  if (String(req.query.token || "") !== token) return res.status(401).json({ error: "token" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rows = Array.isArray(body) ? body : Array.isArray(body.messages) ? body.messages : [body];

  const seen = rows.map((r) => ({
    to: pick(r, ["to", "message.to", "receiver"]),
    from: pick(r, ["from", "message.from", "sender"]),
    ok: answered(r),
    code: pick(r, ["statusCode", "status", "resultCode", "message.statusCode"]),
    at: pick(r, ["dateReceived", "dateProcessed", "updatedAt"]) || new Date().toISOString(),
  }));

  /* 나중에 부모께 푸시를 보내려면 여기서 발신번호로 집을 찾습니다.
     그 표가 아직 없어서, 지금은 받은 것만 돌려줍니다.
     베타 동안에는 Vercel 로그에서 이 줄을 보면 됩니다. */
  console.log("voice-hook", JSON.stringify(seen));

  return res.status(200).json({ ok: true, n: seen.length, seen });
}
