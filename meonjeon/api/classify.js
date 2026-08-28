/* 서버 경유 AI 호출 (명세 SEC-03 / AI_보안_운영)
   API 키는 Vercel 환경변수에만 두고, 브라우저에는 절대 내려가지 않습니다.
   사진(알림장·냉장고)도 여기를 거쳐 갑니다. 저장은 하지 않습니다. */
export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1_500_000;          // base64 기준 약 1.5MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." });

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
      console.error("anthropic error", r.status, data && data.error && data.error.type);
      return res.status(502).json({ error: "AI 호출 실패" });
    }
    // 원문 프롬프트와 사진은 로그에 남기지 않습니다 (개인정보 최소화)
    return res.status(200).json({ content: data.content });
  } catch (e) {
    console.error("classify failed", e && e.name);
    return res.status(502).json({ error: "AI 호출 실패" });
  }
}
