-- ════════════════════════════════════════════════════════
-- 손주한통 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 Run
-- ════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- 가구: 앱의 모든 데이터(할 일·반복업무·설정)를 state에 보관
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null default upper(substr(md5(random()::text), 1, 6)),
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  created_at  timestamptz not null default now()
);

-- 가구 구성원: 어떤 로그인 계정이 어떤 가구에 속하는지
create table if not exists public.household_members (
  household_id uuid references public.households(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  email        text,
  joined_at    timestamptz default now(),
  primary key (household_id, user_id)
);

alter table public.households        enable row level security;
alter table public.household_members enable row level security;

-- 내가 속한 가구 목록 (정책 재귀를 피하려고 함수로 분리)
create or replace function public.my_household_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

drop policy if exists hh_sel on public.households;
drop policy if exists hh_upd on public.households;
drop policy if exists hm_sel on public.household_members;
drop policy if exists hm_ins on public.household_members;   -- 예전 버전에서 만들어졌으면 제거

-- 내 가구만 읽고 쓸 수 있다
create policy hh_sel on public.households
  for select using (id in (select public.my_household_ids()));
create policy hh_upd on public.households
  for update using (id in (select public.my_household_ids()));
create policy hm_sel on public.household_members
  for select using (household_id in (select public.my_household_ids()));
-- ⚠️ household_members에는 INSERT 정책을 두지 않습니다.
--    user_id = auth.uid() 만 확인하면, 로그인한 사람이 아무 household_id나 적어
--    남의 가구에 스스로를 밀어넣을 수 있습니다(가구 id를 알게 되는 경우).
--    합류는 초대 코드를 확인하는 join_household() 로만 가능하고,
--    그 함수는 security definer라 정책 없이도 동작합니다.

-- 가구 새로 만들기
create or replace function public.create_household()
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  insert into public.households default values returning * into h;
  insert into public.household_members(household_id, user_id, email)
    values (h.id, auth.uid(), auth.email());
  return h;
end $$;

-- 초대 코드로 가구 합류
create or replace function public.join_household(p_code text)
returns public.households language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select * into h from public.households where code = upper(trim(p_code));
  if h.id is null then raise exception '초대 코드를 찾을 수 없어요'; end if;
  insert into public.household_members(household_id, user_id, email)
    values (h.id, auth.uid(), auth.email())
    on conflict (household_id, user_id) do nothing;
  return h;
end $$;

grant execute on function public.create_household()      to authenticated;
grant execute on function public.join_household(text)    to authenticated;
grant execute on function public.my_household_ids()      to authenticated;

-- 가족이 수정하면 상대 화면에 바로 알리기 (이미 등록돼 있으면 건너뜀)
do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null;
end $$;

-- ── 베타 지표 조회용 뷰 (Supabase Table Editor에서 바로 확인) ──
create or replace view public.beta_metrics as
select
  h.code                                                as 가구코드,
  (select count(*) from public.household_members m where m.household_id = h.id) as 구성원수,
  jsonb_array_length(coalesce(h.state->'tasks', '[]'::jsonb))    as 할일수,
  (select count(*) from jsonb_array_elements(coalesce(h.state->'tasks','[]'::jsonb)) t
     where (t->>'done')::boolean is true)                        as 완료수,
  (select count(*) from jsonb_array_elements(coalesce(h.state->'tasks','[]'::jsonb)) t
     where t->>'raisedBy' = 'ai')                                as AI가먼저꺼낸일,
  jsonb_array_length(coalesce(h.state->'events', '[]'::jsonb))   as 사용이벤트,
  h.created_at                                          as 시작일,
  h.updated_at                                          as 마지막사용
from public.households h;

-- ⚠️ 이 뷰는 모든 가구를 가로질러 봅니다. 로그인 사용자에게 주면
--    남의 가구 데이터가 보이므로, 대시보드(SQL Editor)에서만 봅니다.
revoke all on public.beta_metrics from anon, authenticated;

-- ── 제휴 카드 성과: 어디서 몇 번 보였고 몇 번 눌렸나 ──
create or replace view public.partner_stats as
select
  e->'props'->>'name' as 파트너,
  e->'props'->>'from' as 뜬자리,
  count(*) filter (where e->>'name' = 'partner_show')  as 노출,
  count(*) filter (where e->>'name' = 'partner_click') as 클릭,
  round(100.0 * count(*) filter (where e->>'name' = 'partner_click')
        / nullif(count(*) filter (where e->>'name' = 'partner_show'), 0), 1) as 클릭률
from public.households h,
     lateral jsonb_array_elements(coalesce(h.state->'events', '[]'::jsonb)) e
where e->>'name' in ('partner_show', 'partner_click')
group by 1, 2
order by 클릭 desc nulls last, 노출 desc;

revoke all on public.partner_stats from anon, authenticated;

-- ════════════════════════════════════════════════════════
-- 알림 구독 (웹 푸시)
-- 이 부분만 따로 붙여넣어도 됩니다
-- ════════════════════════════════════════════════════════
create table if not exists public.push_subs (
  endpoint     text primary key,
  p256dh       text not null,
  auth         text not null,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  hour         int  not null default 8,     -- 그 집이 고른 시각 (0~23, 그 지역 시간)
  tz_offset    int  not null default 540,   -- 한국은 UTC+9 = 540분
  kind         text not null default 'parent',  -- 'parent' 부모 폰 / 'elder' 어른 폰
  updated_at   timestamptz not null default now()
);

create index if not exists push_subs_user on public.push_subs(user_id);
create index if not exists push_subs_hh   on public.push_subs(household_id);

alter table public.push_subs enable row level security;

-- 내 구독만 보고 고칠 수 있습니다. 남의 알림은 못 건드립니다.
drop policy if exists ps_sel on public.push_subs;
drop policy if exists ps_ins on public.push_subs;
drop policy if exists ps_upd on public.push_subs;
drop policy if exists ps_del on public.push_subs;

create policy ps_sel on public.push_subs for select
  using (user_id = auth.uid());
create policy ps_ins on public.push_subs for insert
  with check (user_id = auth.uid() and household_id in (select public.my_household_ids()));
create policy ps_upd on public.push_subs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ps_del on public.push_subs for delete
  using (user_id = auth.uid());

-- 보내는 쪽(api/push-send)은 service_role로 접근하므로 RLS를 통과합니다.
-- 그 키는 Vercel 환경변수에만 두고 브라우저에는 절대 내려보내지 않습니다.

-- ════════════════════════════════════════════════════════
-- 자동전화 발송 기록
-- 이 부분만 따로 붙여넣어도 됩니다
-- ════════════════════════════════════════════════════════
-- 같은 통을 두 번 걸지 않으려고 둡니다. 앱의 state를 서버가 고쳐 쓰면
-- 부모가 그 순간 화면에서 고치던 것과 부딪칩니다. 그래서 따로 적습니다.
create table if not exists public.voice_sent (
  household_id uuid not null references public.households(id) on delete cascade,
  day          date not null,               -- 그날 (한국 시간 기준)
  item_id      text not null,               -- 그 통의 id (앱이 만든 것)
  at           text,                        -- 나가기로 한 시각 "14:30"
  sms          boolean not null default false,
  sent_at      timestamptz not null default now(),
  ok           boolean,                     -- 솔라피가 받아줬나
  err          text,
  -- 웹훅이 나중에 채웁니다
  sec          int,                         -- 통화 길이
  press        text,                        -- 눌러주신 번호 (베타에서만)
  primary key (household_id, day, item_id)
);

create index if not exists voice_sent_day on public.voice_sent(day);

alter table public.voice_sent enable row level security;

-- 부모는 자기 집 기록만 봅니다. 쓰는 쪽은 service_role이라 정책을 안 탑니다.
drop policy if exists vs_sel on public.voice_sent;
create policy vs_sel on public.voice_sent for select
  using (household_id in (select public.my_household_ids()));

-- ── 베타에서 볼 것: 통화 길이 판정이 실제와 맞았나 ──
-- 정식판은 "길이만 보고" 들으셨는지 정합니다. 그게 맞는지를 여기서 봅니다.
create or replace view public.voice_check as
select
  day,
  count(*)                                             as 나간통,
  count(*) filter (where ok)                           as 받아준통,
  count(*) filter (where press = '1')                  as 눌러주심,
  count(*) filter (where sec >= 10)                    as 길이로_들으심,
  count(*) filter (where press is not null and sec is not null
                     and (press = '1') <> (sec >= 10)) as 어긋난통,
  round(avg(sec) filter (where press = '1'), 1)        as 누르신분_평균초,
  round(avg(sec) filter (where press is null), 1)      as 안누르신분_평균초
from public.voice_sent
where not sms
group by day order by day desc;

revoke all on public.voice_check from anon, authenticated;

-- ════════════════════════════════════════════════════
-- 어른 폰 알림 (0902-fi)
-- 이미 push_subs 표가 있는 집은 이 부분만 따로 붙여넣고 Run
-- ════════════════════════════════════════════════════
-- 어른 폰이 조부모님 탭에서 "이 폰으로 알림 받기"를 누르면 kind='elder'로 적힙니다.
-- 서버는 어른께 가는 통을 이 폰에만 보내고, 15분 안에 안 열어보면 전화로 넘깁니다.
alter table public.push_subs add column if not exists kind text not null default 'parent';
