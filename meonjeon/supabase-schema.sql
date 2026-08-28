-- ════════════════════════════════════════════════════════
-- 먼저ON — Supabase 스키마
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
drop policy if exists hm_ins on public.household_members;

-- 내 가구만 읽고 쓸 수 있다
create policy hh_sel on public.households
  for select using (id in (select public.my_household_ids()));
create policy hh_upd on public.households
  for update using (id in (select public.my_household_ids()));
create policy hm_sel on public.household_members
  for select using (household_id in (select public.my_household_ids()));
create policy hm_ins on public.household_members
  for insert with check (user_id = auth.uid());

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

-- 가족이 수정하면 상대 화면에 바로 알리기
alter publication supabase_realtime add table public.households;

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

grant select on public.beta_metrics to authenticated;
