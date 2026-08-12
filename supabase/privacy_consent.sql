-- 개인정보 처리방침 동의 기록 보관용.
-- kairos.sql, kairos_admin.sql 을 실행한 뒤 이 파일을 SQL Editor에서 한 번 실행하세요.
-- (여러 번 실행해도 안전합니다.)

-- 1) 가입 시 동의 기록 (이메일 계정)
alter table public.profiles
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists privacy_version text;

-- 2) 정직이들 이용 신청 시 동의 기록 (이름·학번 등 추가 수집에 대한 동의)
alter table public.kairos_members
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

-- 3) 관리자는 동의 기록을 볼 수 있어야 한다 (이미 있으면 그대로 유지)
drop policy if exists "profiles_kairos_admin_select" on public.profiles;
create policy "profiles_kairos_admin_select"
  on public.profiles for select
  using (public.kairos_is_admin());
