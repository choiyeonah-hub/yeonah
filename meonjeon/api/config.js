/* 브라우저에 내려보내도 되는 공개 설정만 반환합니다.
   (anon key는 공개용 키이며, 실제 보호는 DB의 RLS 정책이 담당합니다) */
export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  });
}
