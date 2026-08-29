/* 서버 경유 AI 호출 (명세 SEC-03 / AI_보안_운영)
   API 키는 Vercel 환경변수에만 두고, 브라우저에는 절대 내려가지 않습니다.
   사진(알림장·냉장고)도 여기를 거쳐 갑니다. 저장은 하지 않습니다. */
export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1_500_000;          // base64 기준 약 1.5MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* 로그인한 사용자인지 확인합니다.
   이 검사가 없으면 누구나 이 주소로 요청을 보내 발주자의 AI 크레딧을 씁니다. */
async function isSignedIn(req) {
  const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const authz = String(req.headers.authorization || "");
  if (!authz.startsWith("Bearer ")) return false;
  const token = authz.slice(7).trim();
  if (!token || token.length > 4000) return false;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return res.status(500).json({ error: "Vercel에 ANTHROPIC_API_KEY가 없어요. 환경변수를 넣고 다시 배포해 주세요." });
  /* .env.example의 예시 값이 그대로 들어가 있는 경우가 잦아 미리 잡아냅니다 */
  if (key === "sk-ant-..." || key.length < 40 || !key.startsWith("sk-ant-")) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY가 예시 값이거나 형식이 달라요. console.anthropic.com에서 만든 sk-ant-api03- 로 시작하는 키로 바꾸고 다시 배포해 주세요.",
    });
  }

  if (!(await isSignedIn(req))) return res.status(401).json({ error: "로그인이 필요합니다." });

  const { prompt, images } = req.body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt 없음" });
  if (prompt.length > 8000) return res.status(400).json({ error: "prompt too long" });

  /* 사진은 개수·크기·형식을 서버에서 다시 확인합니다 */
  let shots = [];
  if (images != null) {
    if (!Array.isArray(images)) return res.status(400).json({ error: "images 형식 오류" });
    if (images.length > MAX_IMAGES) return res.status(400).json({ error: `사진은 ${MAX_IMAGES}장까지예요` });
    for (const im of images) {
      if (!im || typeof im.data !== "string") return res.status(400).json({ error: "images 형식 오류" });
      if (!OK_TYPES.includes(im.media_type)) return res.status(400).json({ error: "지원하지 않는 사진 형식이에요" });
      if (im.data.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: "사진이 너무 커요" });
      shots.push({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } });
    }
  }

  const content = shots.length ? [...shots, { type: "text", text: prompt }] : prompt;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: shots.length ? 2000 : 1400,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      /* 무엇이 잘못됐는지 화면에 알려줘야 손을 쓸 수 있습니다.
         키 값 자체는 절대 내보내지 않고, 종류와 사유만 전달합니다. */
      const type = (data && data.error && data.error.type) || "";
      const msg = (data && data.error && data.error.message) || "";
      console.error("anthropic error", r.status, type, msg);
      const friendly =
        r.status === 401 || r.status === 403 || type === "authentication_error"
          ? "AI 키가 올바르지 않아요. Vercel의 ANTHROPIC_API_KEY를 확인해 주세요."
        : r.status === 404 || type === "not_found_error"
          ? "AI 모델을 찾을 수 없어요. 모델 이름을 확인해 주세요."
        : r.status === 429 || type === "rate_limit_error"
          ? "AI 요청이 잠시 몰렸어요. 1분 뒤에 다시 해주세요."
        : /credit balance/i.test(msg)
          ? "AI 크레딧이 부족해요. console.anthropic.com에서 충전해 주세요."
        : /spend limit|usage limit/i.test(msg)
          ? "이번 달 AI 지출 한도에 닿았어요. console.anthropic.com에서 한도를 확인해 주세요."
        : type === "overloaded_error"
          ? "AI가 지금 붐벼요. 잠시 뒤에 다시 해주세요."
        : msg
          ? `AI 호출 실패 (${r.status}) — ${String(msg).slice(0, 160)}`
          : `AI 호출 실패 (${r.status})`;
      return res.status(502).json({ error: friendly });
    }
    // 원문 프롬프트와 사진은 로그에 남기지 않습니다 (개인정보 최소화)
    return res.status(200).json({ content: data.content });
  } catch (e) {
    console.error("classify failed", e && e.name, e && e.message);
    return res.status(502).json({ error: `AI 서버에 닿지 못했어요 (${(e && e.name) || "네트워크"})` });
  }
}
