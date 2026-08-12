-- KAIROS 관리자 기능 추가분.
-- kairos.sql 을 먼저 실행한 뒤, 이 파일을 SQL Editor에서 한 번 실행하세요.
-- (여러 번 실행해도 안전합니다.)

-- 1) 관리자는 가입자 전체 목록을 볼 수 있다.
drop policy if exists "profiles_kairos_admin_select" on public.profiles;
create policy "profiles_kairos_admin_select"
  on public.profiles for select
  using (public.kairos_is_admin());

-- 2) 관리자는 KAIROS 신청을 하지 않은 사람에게도 권한을 줄 수 있다.
drop policy if exists "kairos_members_insert_admin" on public.kairos_members;
create policy "kairos_members_insert_admin"
  on public.kairos_members for insert
  with check (public.kairos_is_admin());

-- 3) 가입자 표가 없을 경우를 대비 (profiles.sql 을 실행하지 않았다면 여기서 만들어진다)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

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
