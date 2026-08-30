/* 베타 전체 지표 — 참여 가구를 한눈에.
   매주 Supabase에 SQL을 붙여넣지 않아도 되게, 앱 안에서 바로 봅니다.

   ⚠ service_role을 씁니다(모든 가구를 세어야 하므로).
      대신 ADMIN_EMAIL 로 로그인한 사람에게만 답합니다.
      숫자만 세고, 어느 집이 무엇을 했는지는 절대 내보내지 않습니다. */

const env = (k) => String(process.env[k] || "").trim();

export default async function handler(req, res) {
  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY");
  const service = env("SUPABASE_SERVICE_KEY");
  const admin = env("ADMIN_EMAIL").toLowerCase();

  if (!url || !anon) return res.status(500).json({ error: "서버에 Supabase 설정이 없어요" });
  if (!admin) return res.status(200).json({ error: "ADMIN_EMAIL을 Vercel 환경변수에 넣어주세요" });
  if (!service) return res.status(200).json({ error: "SUPABASE_SERVICE_KEY가 없어요" });

  /* 누가 물어보는지 확인 */
  const authz = String(req.headers.authorization || "");
  if (!authz.startsWith("Bearer ")) return res.status(401).json({ error: "로그인이 필요합니다" });
  const token = authz.slice(7).trim();
  if (!token || token.length > 4000) return res.status(401).json({ error: "로그인이 필요합니다" });

  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!u.ok) return res.status(401).json({ error: "로그인이 만료됐어요" });
  const user = await u.json();
  if (String(user.email || "").toLowerCase() !== admin) {
    return res.status(403).json({ error: "이 화면은 운영자만 볼 수 있어요" });
  }

  const H = { apikey: service, Authorization: `Bearer ${service}` };
  const get = async (path) => {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
    return r.ok ? r.json() : null;
  };

  /* 가구의 마지막 활동 시각과, state 안의 숫자 하나(opens)만 가져옵니다.
     집안 내용은 여전히 안 읽습니다 — 가져오는 건 정수 둘뿐입니다.
     몇 번 열었나(opens), 복지를 몇 번 읽었나(wfRead).
     이 숫자가 있어야 광고를 붙일 값어치가 있는지 판단이 됩니다. */
  const hh = await get("households?select=id,created_at,updated_at,state->opens,state->wfRead");
  const subs = await get("push_subs?select=household_id");
  if (!hh) return res.status(500).json({ error: "가구를 못 읽었어요" });

  const DAY = 86400000, now = Date.now();
  const days = (t) => (now - new Date(t).getTime()) / DAY;
  const withPush = new Set((subs || []).map((s) => s.household_id));

  const active = (list, d) => list.filter((h) => days(h.updated_at) <= d).length;
  const on = hh.filter((h) => withPush.has(h.id));
  const off = hh.filter((h) => !withPush.has(h.id));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  /* 만든 지 4주 넘은 집만 4주 유지율에 넣습니다 — 어제 들어온 집을 이탈로 세면 안 됩니다 */
  const old4 = hh.filter((h) => days(h.created_at) >= 28);
  const old4on = old4.filter((h) => withPush.has(h.id));
  const old4off = old4.filter((h) => !withPush.has(h.id));

  return res.status(200).json({
    ok: true,
    asOf: new Date().toISOString().slice(0, 10),
    households: hh.length,
    push: { on: on.length, off: off.length, pct: pct(on.length, hh.length) },
    active: {
      d7: active(hh, 7), d14: active(hh, 14), d30: active(hh, 30),
      pct7: pct(active(hh, 7), hh.length),
    },
    /* 이 앱이 왜 필요한지를 증명하는 숫자 */
    compare: {
      on: { n: on.length, d7: active(on, 7), pct: pct(active(on, 7), on.length) },
      off: { n: off.length, d7: active(off, 7), pct: pct(active(off, 7), off.length) },
    },
    /* 하루에 몇 번 여는지 — 붙잡아두는 앱인지 아닌지가 여기서 갈립니다 */
    opens: (() => {
      const seen = hh.filter((h) => Number(h.opens) > 0);
      if (!seen.length) return { n: 0, perDay: 0, total: 0 };
      const total = seen.reduce((a, h) => a + Number(h.opens || 0), 0);
      /* 만든 지 하루가 안 된 집은 1일로 봅니다 */
      const dayss = seen.reduce((a, h) => a + Math.max(days(h.created_at), 1), 0);
      return { n: seen.length, total, perDay: Math.round((total / dayss) * 10) / 10 };
    })(),
    /* 복지를 실제로 읽는지 — "꼭 필요한가"의 답은 여기서 나옵니다.
       읽은 집이 거의 없으면 빼는 게 맞습니다. */
    welfare: (() => {
      const read = hh.filter((h) => Number(h.wfRead) > 0);
      return {
        n: read.length,
        pct: pct(read.length, hh.length),
        total: hh.reduce((a, h) => a + Number(h.wfRead || 0), 0),
      };
    })(),
    retain4w: {
      n: old4.length,
      kept: active(old4, 7), pct: pct(active(old4, 7), old4.length),
      on: { n: old4on.length, kept: active(old4on, 7), pct: pct(active(old4on, 7), old4on.length) },
      off: { n: old4off.length, kept: active(old4off, 7), pct: pct(active(old4off, 7), old4off.length) },
    },
  });
}
