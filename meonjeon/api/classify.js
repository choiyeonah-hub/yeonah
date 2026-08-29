/* 서버 경유 AI 호출 (명세 SEC-03 / AI_보안_운영)
   API 키는 Vercel 환경변수에만 두고, 브라우저에는 절대 내려가지 않습니다.
   사진(알림장·냉장고)도 여기를 거쳐 갑니다. 저장은 하지 않습니다. */
export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

const MAX_IMAGES = 3;
/* 웹 검색은 주 2회 "미리 찾아보기"에서만 켭니다. 검색 한 번마다 따로 과금되기 때문에
   말하기 정리·사진 인식에서는 절대 켜지 않습니다.
   찾는 곳도 살림에 쓸모 있는 데로 좁힙니다. 아무 데나 뒤지면 광고 글이 올라옵니다. */
const SEARCH_DOMAINS = [
  "reddit.com", "youtube.com",
  "blog.naver.com", "cafe.naver.com", "post.naver.com", "in.naver.com",
  "brunch.co.kr", "tistory.com",
  "gov.kr", "korea.kr", "kdca.go.kr", "childcare.go.kr", "schoolinfo.go.kr",
  "seoul.go.kr", "nhis.or.kr", "familynet.or.kr",
];
const MAX_SEARCHES = 3;      /* 한 번의 발굴에서 검색 3회까지 */
const MAX_ROUNDS = 3;        /* pause_turn으로 끊기면 이어받는 횟수 */
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

  const workspace = (process.env.ANTHROPIC_WORKSPACE_ID || "").trim();

  const { prompt, images, search } = req.body || {};
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
  /* 웹 검색은 사진이 없는 요청에서만, 그리고 클라이언트가 명시적으로 켰을 때만 */
  const useSearch = search === true && shots.length === 0;

  const headers = {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    /* 계정에 연결된(identity-linked) 키는 어느 워크스페이스에서 쓰는지도 알려줘야 합니다.
       워크스페이스에 묶인 키를 쓰면 이 값은 없어도 됩니다. */
    ...(workspace ? { "anthropic-workspace-id": workspace } : {}),
  };
  const base = {
    model: "claude-sonnet-5",
    /* ⚠ 이 모델은 thinking을 안 적으면 "적응형 사고"가 켜집니다.
       식단을 짤 때 생각에만 2,400토큰을 다 쓰고 답을 한 글자도 못 쓴 일이 있었습니다
       (화면에는 "AI가 빈 답을 보냈어요 · 받은 것: thinking · 글자 0"로 찍혔습니다).
       여기서 하는 일은 정해진 모양의 JSON을 뽑는 것이라 깊은 추론이 필요 없습니다.
       끄면 답이 바로 나오고, 값도 싸고, 빨라집니다.
       발굴(웹 검색)만은 판단이 필요해서 켜둡니다. */
    ...(useSearch ? {} : { thinking: { type: "disabled" } }),
    /* 상한일 뿐이라 올려도 값이 더 들지 않습니다. 쓴 만큼만 냅니다.
       한글은 토큰을 많이 먹어서 넉넉히 둡니다. */
    max_tokens: useSearch ? 8000 : shots.length ? 4000 : 4000,
    ...(useSearch ? {
      tools: [{
        type: "web_search_20260209",
        name: "web_search",
        max_uses: MAX_SEARCHES,
        allowed_domains: SEARCH_DOMAINS,
      }],
    } : {}),
  };

  try {
    const messages = [{ role: "user", content }];
    let data = null, r = null;
    /* 검색을 쓰면 한 번에 안 끝나고 pause_turn으로 돌아올 수 있습니다.
       그대로 두면 답이 잘린 채로 화면에 갑니다. 끝날 때까지 이어받습니다. */
    for (let round = 0; round < MAX_ROUNDS; round++) {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers, body: JSON.stringify({ ...base, messages }),
      });
      data = await r.json();
      if (!r.ok) break;
      if (data.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: data.content });
    }
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
        : /anthropic-workspace-id/i.test(msg)
          ? "이 AI 키는 워크스페이스를 함께 알려줘야 해요. Vercel에 ANTHROPIC_WORKSPACE_ID를 추가하거나, 워크스페이스에 묶인 키를 새로 만들어 주세요."
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
    if (useSearch) {
      const n = (data.content || []).filter((b) => b.type === "web_search_tool_result").length;
      console.log("discover with web search, results blocks:", n);
    }
    /* 답에 글이 안 들어 있는 경우가 실제로 생깁니다. 그때 화면에는
       "AI가 빈 답을 보냈어요"만 뜨고 왜인지 알 길이 없었습니다.
       무엇이 왔는지(블록 종류·중단 사유·낸 토큰 수)를 함께 내려보냅니다.
       원문은 안 보냅니다 — 개인정보가 섞일 수 있습니다. */
    const blocks = Array.isArray(data.content) ? data.content : [];
    const types = blocks.map((b) => b && b.type);
    const chars = blocks.filter((b) => b && b.type === "text")
      .reduce((n, b) => n + String(b.text || "").length, 0);
    const outTok = (data.usage && data.usage.output_tokens) || 0;
    if (!chars) console.warn("empty text from model", { types, stop: data.stop_reason, outTok });
    return res.status(200).json({
      content: data.content,
      stop_reason: data.stop_reason,
      diag: { types, chars, out: outTok },
    });
  } catch (e) {
    console.error("classify failed", e && e.name, e && e.message);
    return res.status(502).json({ error: `AI 서버에 닿지 못했어요 (${(e && e.name) || "네트워크"})` });
  }
}
