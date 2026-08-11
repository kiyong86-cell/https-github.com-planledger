-- KAIROS 학교 전용 구역 테이블.
-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행하세요.
--
-- 구조: 누구나 이 사이트에 이메일로 가입할 수 있지만,
--      KAIROS는 관리자가 "교사" 또는 "학생"으로 승인한 사람만 들어갈 수 있다.

-- ⚠️ 관리자 이메일 — 이 이메일로 로그인한 사람이 승인 권한을 갖는다.
--    아래 함수 안의 이메일을 관리자 이메일로 바꾸세요.

create or replace function public.kairos_admin_email()
returns text
language sql
immutable
as $$
  select 'kiyong0263@naver.com'::text;
$$;

-- 1. 이용 신청·승인 명단 ---------------------------------------------------
create table if not exists public.kairos_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  student_no text not null default '',
  grade text not null default '',
  klass text not null default '',
  requested_role text not null default 'student',  -- 신청한 구분: student | teacher
  role text not null default 'pending',            -- 승인 결과: pending | student | teacher | admin | rejected
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.kairos_members enable row level security;

-- 내 역할을 읽는 함수. RLS를 우회(security definer)하므로 정책 안에서 안전하게 쓸 수 있다.
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

-- 내 신청서는 내가 보고, 교사·관리자는 전체 명단을 본다.
create policy "kairos_members_select"
  on public.kairos_members for select
  using (auth.uid() = user_id or public.kairos_is_staff());

-- 신청은 본인만, 그리고 반드시 '대기(pending)' 상태로만 넣을 수 있다.
create policy "kairos_members_insert_own_pending"
  on public.kairos_members for insert
  with check (auth.uid() = user_id and role = 'pending');

-- 승인·거절·역할 변경은 관리자만 한다.
create policy "kairos_members_update_admin"
  on public.kairos_members for update
  using (public.kairos_is_admin())
  with check (public.kairos_is_admin());

create policy "kairos_members_delete_admin"
  on public.kairos_members for delete
  using (public.kairos_is_admin());

-- 2. 주간 계획·실행 데이터 -------------------------------------------------
create table if not exists public.kairos_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week text not null,                       -- ISO 주차, 예) 2026-W33
  data jsonb not null default '{}'::jsonb,  -- 요일별 계획/실행 전체
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);

alter table public.kairos_weeks enable row level security;

-- 학생은 자기 것만, 교사·관리자는 전체를 본다.
create policy "kairos_weeks_select_own_or_staff"
  on public.kairos_weeks for select
  using (auth.uid() = user_id or public.kairos_is_staff());

-- 승인된 사람만 쓸 수 있다.
create policy "kairos_weeks_insert_approved"
  on public.kairos_weeks for insert
  with check (
    auth.uid() = user_id
    and (public.kairos_my_role() in ('student', 'teacher', 'admin') or public.kairos_is_admin())
  );

create policy "kairos_weeks_update_own"
  on public.kairos_weeks for update
  using (auth.uid() = user_id);

create policy "kairos_weeks_delete_own"
  on public.kairos_weeks for delete
  using (auth.uid() = user_id);

create index if not exists kairos_weeks_week_idx on public.kairos_weeks (week);

-- 3. 예전 구조 정리 (처음 실행하는 경우 아무 일도 하지 않음) ----------------
drop table if exists public.kairos_profiles;
drop table if exists public.kairos_teachers;
