/* 브라우저에 내려보내도 되는 공개 설정만 반환합니다.
   (anon key는 공개용 키이며, 실제 보호는 DB의 RLS 정책이 담당합니다)

   환경변수는 전부 trim해서 씁니다. Vercel 화면에 붙여넣을 때 줄바꿈이나
   공백 한 칸이 딸려 들어가기 쉬운데, 값은 점으로 가려져 있어 눈으로 못 찾습니다.
   그 한 칸 때문에 알림이 조용히 안 오는 일을 만들지 않습니다. */
const env = (k) => String(process.env[k] || "").trim();

export default function handler(req, res) {
  /* 값은 절대 안 보여주고, "들어 있나 / 공백이 붙었나"만 알려줍니다.
     Vercel이 값을 가려놓아서 눈으로는 확인할 방법이 없습니다. */
  const check = (k) => {
    const raw = process.env[k];
    if (raw == null || raw === "") return "없음";
    return raw !== raw.trim() ? "공백 붙음 ⚠" : "정상";
  };
  const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "ANTHROPIC_API_KEY",
                "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT",
                "CRON_SECRET", "SUPABASE_SERVICE_KEY", "ADMIN_EMAIL",
                "SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_FROM"];

  res.status(200).json({
    url: env("SUPABASE_URL"),
    anonKey: env("SUPABASE_ANON_KEY"),
    /* 알림을 켤 때 브라우저에 필요한 공개 키입니다. 이름 그대로 공개용이라
       내려보내도 됩니다. 짝이 되는 비밀 키는 서버에만 있습니다. */
    vapidPublicKey: env("VAPID_PUBLIC_KEY"),
    /* 어른께 실제로 걸리는 발신번호. 부모가 어른 폰에 저장해드릴 번호라 화면에 보여야 하고,
       서버가 거는 번호와 같은 값이어야 합니다. 숫자만 내려보냅니다. 키·시크릿은 절대 안 나갑니다. */
    callFrom: env("SOLAPI_FROM").replace(/[^0-9]/g, ""),
    /* 설정 점검용 — 값은 안 나갑니다 */
    env: Object.fromEntries(keys.map((k) => [k, check(k)])),
  });
}
