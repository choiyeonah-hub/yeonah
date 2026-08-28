/* 휴일 날씨 브리핑용 예보.
   Open-Meteo는 키가 필요 없고 비상업/소규모 사용이 무료입니다.
   좌표만 넘기고 가구 정보는 보내지 않습니다. */
export default async function handler(req, res) {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "좌표가 올바르지 않아요" });
  }
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}`
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    + "&timezone=Asia%2FSeoul&forecast_days=12";
  try {
    const r = await fetch(url);
    const d = await r.json();
    if (!r.ok || !d.daily) return res.status(502).json({ error: "날씨를 가져오지 못했어요" });
    // 30분 캐시 — 같은 동네 가족이 여러 번 열어도 한 번만 나갑니다
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json(d.daily);
  } catch (e) {
    console.error("weather failed", e && e.name);
    return res.status(502).json({ error: "날씨를 가져오지 못했어요" });
  }
}
