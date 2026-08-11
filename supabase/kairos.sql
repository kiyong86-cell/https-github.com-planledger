-- KAIROS 학교 전용 구역 테이블.
-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행하세요.

-- 1. 교사 계정 목록 --------------------------------------------------------
-- 여기에 적힌 이메일로 로그인한 사람만 학생 전체 기록을 볼 수 있습니다.
create table if not exists public.kairos_teachers (
  email text primary key
);

alter table public.kairos_teachers enable row level security;

-- 본인이 교사 명단에 있는지만 확인할 수 있다.
create policy "kairos_teachers_read_self"
  on public.kairos_teachers for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- 교사 이메일 등록 (자기 이메일로 바꿔서 실행하세요)
insert into public.kairos_teachers (email)
values ('kiyong0263@naver.com')
on conflict (email) do nothing;

-- 교사인지 확인하는 함수 (RLS에서 사용)
create or replace function public.kairos_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kairos_teachers
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 2. 학생 명부 ------------------------------------------------------------
create table if not exists public.kairos_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  student_no text not null unique,
  name text not null default '',
  grade text not null default '',
  klass text not null default '',
  created_at timestamptz not null default now()
);

alter table public.kairos_profiles enable row level security;

create policy "kairos_profiles_select_own_or_teacher"
  on public.kairos_profiles for select
  using (auth.uid() = user_id or public.kairos_is_teacher());

create policy "kairos_profiles_update_own"
  on public.kairos_profiles for update
  using (auth.uid() = user_id);

-- 3. 주간 계획·실행 데이터 -------------------------------------------------
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

create policy "kairos_weeks_select_own_or_teacher"
  on public.kairos_weeks for select
  using (auth.uid() = user_id or public.kairos_is_teacher());

create policy "kairos_weeks_insert_own"
  on public.kairos_weeks for insert
  with check (auth.uid() = user_id);

create policy "kairos_weeks_update_own"
  on public.kairos_weeks for update
  using (auth.uid() = user_id);

create policy "kairos_weeks_delete_own"
  on public.kairos_weeks for delete
  using (auth.uid() = user_id);

create index if not exists kairos_weeks_week_idx on public.kairos_weeks (week);
