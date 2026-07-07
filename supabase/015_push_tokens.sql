-- ============================================================
-- 015: 원격 푸시 토큰 저장 (Expo Push)
-- 실행: Supabase SQL Editor 에 붙여넣고 Run
-- 전제: 001~014 적용됨 (is_admin(), profiles)
-- ============================================================

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- 본인 토큰만 등록·수정·삭제, 조회는 본인 또는 관리자
drop policy if exists "push_tokens_select" on public.push_tokens;
create policy "push_tokens_select" on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "push_tokens_insert" on public.push_tokens;
create policy "push_tokens_insert" on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_update" on public.push_tokens;
create policy "push_tokens_update" on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete" on public.push_tokens;
create policy "push_tokens_delete" on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- notifications insert → Edge Function(send-push) 호출용 트리거
-- pg_net 확장으로 Edge Function 을 비동기 호출한다.
-- 아래 URL/키는 프로젝트에 맞게 바꾼 뒤 실행하세요.
--   {PROJECT_REF} : Supabase 프로젝트 ref
--   {ANON_OR_SERVICE_KEY} : service_role 키 (Edge Function 인증용)
-- pg_net 미사용 시: 대시보드의 Database Webhooks 로 대체 가능.
-- ------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := 'https://{PROJECT_REF}.supabase.co/functions/v1/send-push';
  v_key text := '{ANON_OR_SERVICE_KEY}';
begin
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', new.title,
      'message', new.message,
      'kind', new.kind
    )
  );
  return new;
end;
$$;

drop trigger if exists notifications_push_trigger on public.notifications;
create trigger notifications_push_trigger
  after insert on public.notifications
  for each row execute function public.notify_push_on_insert();
