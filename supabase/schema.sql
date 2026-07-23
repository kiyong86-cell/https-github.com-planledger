-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행하세요.

-- 1. 기획안 테이블
create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 기획안',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_plans enable row level security;

create policy "business_plans_select_own"
  on public.business_plans for select
  using (auth.uid() = user_id);

create policy "business_plans_insert_own"
  on public.business_plans for insert
  with check (auth.uid() = user_id);

create policy "business_plans_update_own"
  on public.business_plans for update
  using (auth.uid() = user_id);

create policy "business_plans_delete_own"
  on public.business_plans for delete
  using (auth.uid() = user_id);

-- 2. 영수증 테이블
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_date date not null default current_date,
  vendor text,
  amount numeric(12, 2) not null default 0,
  category text,
  memo text,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

create policy "receipts_select_own"
  on public.receipts for select
  using (auth.uid() = user_id);

create policy "receipts_insert_own"
  on public.receipts for insert
  with check (auth.uid() = user_id);

create policy "receipts_update_own"
  on public.receipts for update
  using (auth.uid() = user_id);

create policy "receipts_delete_own"
  on public.receipts for delete
  using (auth.uid() = user_id);

-- 3. 파일(사진) 저장용 Storage 버킷 (비공개)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- 업로드 경로는 서버가 자동으로 "{user_id}/파일명" 형식으로 저장합니다.
create policy "uploads_select_own"
  on storage.objects for select
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "uploads_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "uploads_delete_own"
  on storage.objects for delete
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
