-- 가입자 이름/단체명 저장용 추가 스키마.
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- (다른 sql 파일과 순서 상관없이 실행 가능합니다.)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 본인 정보는 스스로 넣고/보고/고칠 수 있음
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- 제작자(관리자)만 전체 가입자 목록 조회 가능
-- ▼▼▼ 아래 이메일을 본인이 로그인할 이메일로 바꾸세요 (.env의 NEXT_PUBLIC_ADMIN_EMAIL과 동일하게) ▼▼▼
create policy "profiles_admin_select"
  on public.profiles for select
  using ((auth.jwt() ->> 'email') = 'kiyong0263@naver.com');
