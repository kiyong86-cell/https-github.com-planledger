-- ============================================================
-- 정직이들(학교 시간 계획표) + 가입자 관리 전체 설치 SQL
--
-- 사용법: Supabase → SQL Editor → + New query → 이 파일 전체를 붙여넣고 Run
-- 여러 번 실행해도 안전합니다. (이미 있는 것은 건드리지 않습니다)
--
-- ⚠️ 아래 관리자 이메일만 본인 것으로 바꾸세요.
--    Vercel 환경변수 NEXT_PUBLIC_ADMIN_EMAIL 과 같은 값이어야 합니다.
-- ============================================================

create or replace function public.kairos_admin_email()
returns text
language sql
immutable
as $$
  select 'kiyong0263@naver.com'::text;   -- ← 관리자 이메일
$$;


-- ============================================================
-- 1. 표 만들기
-- ============================================================

-- 1-1. 가입자 명부 (사이트에 로그인한 사람)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

-- 개인정보처리방침 동의 기록
alter table public.profiles
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists privacy_version text;

-- 1-2. 정직이들 이용 신청·승인 명단
create table if not exists public.kairos_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  grade text not null default '',
  klass text not null default '',
  requested_role text not null default 'student',  -- 신청 구분: student | teacher
  role text not null default 'pending',            -- 승인 결과: pending | student | teacher | admin | rejected
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- 신청 시 개인정보 수집·이용 동의 기록
alter table public.kairos_members
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

-- 1-3. 주간 계획·실행 데이터
create table if not exists public.kairos_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week text not null,                       -- ISO 주차, 예) 2026-W33
  data jsonb not null default '{}'::jsonb,  -- 요일별 계획/실행 전체
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);

create index if not exists kairos_weeks_week_idx on public.kairos_weeks (week);


-- ============================================================
-- 2. 역할 판별 함수 (아래 접근 규칙에서 사용)
-- ============================================================

-- 지금 로그인한 사람의 역할. security definer 라서 접근 규칙 안에서 안전하게 쓸 수 있다.
create or replace function public.kairos_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.kairos_members where user_id = auth.uid()),
    'none'
  );
$$;

create or replace function public.kairos_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kairos_my_role() = 'admin'
      or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(public.kairos_admin_email());
$$;

create or replace function public.kairos_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kairos_my_role() in ('teacher', 'admin') or public.kairos_is_admin();
$$;


-- ============================================================
-- 3. 접근 규칙 (누가 무엇을 볼 수 있는지)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.kairos_members enable row level security;
alter table public.kairos_weeks enable row level security;

-- 3-1. 가입자 명부: 본인 것은 본인이, 전체는 관리자만
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_kairos_admin_select" on public.profiles;
create policy "profiles_kairos_admin_select"
  on public.profiles for select
  using (public.kairos_is_admin());

-- 3-2. 이용 신청 명단
--      내 신청서는 내가, 전체 명단은 교사·관리자가 본다
drop policy if exists "kairos_members_select" on public.kairos_members;
create policy "kairos_members_select"
  on public.kairos_members for select
  using (auth.uid() = user_id or public.kairos_is_staff());

-- 신청은 본인만, 반드시 '대기(pending)' 상태로
drop policy if exists "kairos_members_insert_own_pending" on public.kairos_members;
create policy "kairos_members_insert_own_pending"
  on public.kairos_members for insert
  with check (auth.uid() = user_id and role = 'pending');

-- 관리자는 신청하지 않은 사람에게도 권한을 줄 수 있다
drop policy if exists "kairos_members_insert_admin" on public.kairos_members;
create policy "kairos_members_insert_admin"
  on public.kairos_members for insert
  with check (public.kairos_is_admin());

-- 승인·거절·역할 변경은 관리자만
drop policy if exists "kairos_members_update_admin" on public.kairos_members;
create policy "kairos_members_update_admin"
  on public.kairos_members for update
  using (public.kairos_is_admin())
  with check (public.kairos_is_admin());

drop policy if exists "kairos_members_delete_admin" on public.kairos_members;
create policy "kairos_members_delete_admin"
  on public.kairos_members for delete
  using (public.kairos_is_admin());

-- 3-3. 주간 계획 데이터
--      학생은 자기 것만, 교사·관리자는 전체를 본다
drop policy if exists "kairos_weeks_select_own_or_staff" on public.kairos_weeks;
create policy "kairos_weeks_select_own_or_staff"
  on public.kairos_weeks for select
  using (auth.uid() = user_id or public.kairos_is_staff());

-- 승인된 사람만 저장할 수 있다
drop policy if exists "kairos_weeks_insert_approved" on public.kairos_weeks;
create policy "kairos_weeks_insert_approved"
  on public.kairos_weeks for insert
  with check (
    auth.uid() = user_id
    and (public.kairos_my_role() in ('student', 'teacher', 'admin') or public.kairos_is_admin())
  );

drop policy if exists "kairos_weeks_update_own" on public.kairos_weeks;
create policy "kairos_weeks_update_own"
  on public.kairos_weeks for update
  using (auth.uid() = user_id);

drop policy if exists "kairos_weeks_delete_own" on public.kairos_weeks;
create policy "kairos_weeks_delete_own"
  on public.kairos_weeks for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 4. 예전 구조 정리 (처음 설치하는 경우 아무 일도 하지 않음)
-- ============================================================
drop table if exists public.kairos_profiles;
drop table if exists public.kairos_teachers;
