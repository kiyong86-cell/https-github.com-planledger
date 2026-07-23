-- 사용량 통계용 추가 스키마.
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- (기존 schema.sql을 이미 실행했다면, 이 파일만 추가로 실행하면 됩니다.)

-- 이벤트 기록 테이블: 내보내기·생성 등 사용 기록이 한 줄씩 쌓입니다.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  type text not null,        -- 예: export_docx, export_hwpx, export_pdf, plan_created, receipt_created
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- 로그인한 사용자는 "자기 이벤트 추가"만 가능
create policy "events_insert_own"
  on public.events for insert
  with check (auth.uid() = user_id);

-- 제작자(관리자)만 전체 통계를 "읽기" 가능.
-- ▼▼▼ 아래 이메일을 본인이 로그인할 이메일로 바꾸세요 (.env의 NEXT_PUBLIC_ADMIN_EMAIL과 동일하게) ▼▼▼
create policy "events_admin_select"
  on public.events for select
  using ((auth.jwt() ->> 'email') = 'kiyong0263@naver.com');

create index if not exists events_type_created_idx
  on public.events (type, created_at);
