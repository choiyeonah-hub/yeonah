/* 브라우저에 내려보내도 되는 공개 설정만 반환합니다.
   (anon key는 공개용 키이며, 실제 보호는 DB의 RLS 정책이 담당합니다) */
export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    /* 알림을 켤 때 브라우저에 필요한 공개 키입니다. 이름 그대로 공개용이라
       내려보내도 됩니다. 짝이 되는 비밀 키는 서버에만 있습니다. */
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  });
}
