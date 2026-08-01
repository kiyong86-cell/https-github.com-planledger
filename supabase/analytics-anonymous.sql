-- 무가입(익명) 사용 통계로 전환하기 위한 정책 변경.
-- Supabase SQL Editor에서 한 번 실행하세요.

-- 1) 기존 "로그인 사용자만 기록 가능" 정책 제거
drop policy if exists "events_insert_own" on public.events;

-- 2) 누구나(비로그인 포함) 익명 이벤트를 기록할 수 있게 허용.
--    단, user_id는 반드시 비어 있어야 하므로 개인 식별 정보가 저장되지 않는다.
create policy "events_insert_anonymous"
  on public.events for insert
  with check (user_id is null);

-- 조회는 기존 정책(제작자 이메일만 select) 그대로 유지됩니다.

-- 3) (선택) 회원가입을 받지 않으므로 가입자 테이블은 더 이상 쓰지 않습니다.
--    남은 데이터를 정리하려면 아래 주석을 해제해 실행하세요.
-- drop table if exists public.profiles;
