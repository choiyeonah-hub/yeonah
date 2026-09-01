/* 자동전화 원가 재보기 — 딱 한 번 쓰고 지울 자리입니다.

   재보려는 것은 셋입니다.
     ① 안 받으면 얼마가 빠지는가 (재발송이 유료인지)
     ② 어른 폰에 어떤 이름·번호로 뜨는가
     ③ 버튼 입력(1번)을 결과로 받을 수 있는가

   쓰는 법 — 브라우저 주소창에 그대로 치시면 됩니다.
     /api/voice-test?token=…&action=balance   잔액만 봅니다
     /api/voice-test?token=…&action=send      한 통 걸고, 걸기 전 잔액을 같이 돌려줍니다
   걸고 나서 다시 balance를 부르면 얼마가 빠졌는지 나옵니다.

   ⚠ 받는 번호는 환경변수에 박아둔 번호 하나뿐입니다. 주소로 못 바꿉니다.
      아무나 열어서 남에게 전화를 걸 수 있으면 안 되니까요.
   ⚠ 키는 Vercel 환경변수에만 넣으세요. 브라우저로 내려가지 않습니다. */
import crypto from "crypto";

const API = "https://api.solapi.com";

function authHeader(key, secret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function call(path, key, secret, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      Authorization: authHeader(key, secret),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await r.json(); } catch { data = { raw: "응답을 읽지 못했습니다" }; }
  return { status: r.status, ok: r.ok, data };
}

export default async function handler(req, res) {
  const key = String(process.env.SOLAPI_API_KEY || "").trim();
  const secret = String(process.env.SOLAPI_API_SECRET || "").trim();
  const from = String(process.env.SOLAPI_FROM || "").trim();      // 등록한 발신번호
  const to = String(process.env.VOICE_TEST_TO || "").trim();      // 받을 번호 (연아님 폰)
  const token = String(process.env.VOICE_TEST_TOKEN || "").trim();

  if (!key || !secret) return res.status(500).json({ error: "SOLAPI_API_KEY / SOLAPI_API_SECRET 가 없습니다" });
  if (!token) return res.status(500).json({ error: "VOICE_TEST_TOKEN 을 정해서 넣어주세요 (아무 긴 글자나)" });
  if (String(req.query.token || "") !== token) return res.status(401).json({ error: "token 이 다릅니다" });

  const action = String(req.query.action || "balance");

  /* 잔액 */
  const bal = await call("/cash/v1/balance", key, secret);
  if (action === "balance") {
    return res.status(200).json({ 잔액: bal.data, 상태: bal.status });
  }

  if (action !== "send") return res.status(400).json({ error: "action 은 balance 또는 send" });
  if (!from || !to) return res.status(500).json({ error: "SOLAPI_FROM / VOICE_TEST_TO 가 없습니다" });

  /* 한 통 겁니다. 실제로 어른께 드릴 말투 그대로 재봅니다 */
  const 문구 =
    "안녕하세요. 오늘 하원은 네 시 사십 분입니다. " +
    "가방에 물통을 챙겨 보내주세요. " +
    "다 하셨으면 일 번을 눌러주세요.";

  const send = await call("/messages/v4/send", key, secret, "POST", {
    message: {
      to, from,
      text: 문구,
      type: "VOICE",
      voiceOptions: { voiceType: "FEMALE" },
    },
  });

  return res.status(200).json({
    걸기_전_잔액: bal.data,
    발송_결과: send.data,
    발송_상태: send.status,
    다음: "전화를 일부러 받지 마세요. 몇 번 더 오는지 세신 다음 action=balance 로 잔액을 다시 보세요.",
  });
}
