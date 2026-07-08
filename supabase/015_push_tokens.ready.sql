-- ============================================================
-- 015 READY: 프로젝트 ref 반영본
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
--
-- ★ 아래 {SERVICE_ROLE_KEY} 만 교체하세요
--   Settings → API → service_role (secret) 복사
--   GitHub / 채팅에 절대 올리지 마세요
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
-- 트리거: notifications insert → send-push Edge Function
-- Edge Function 을 먼저 배포한 뒤 실행하세요.
-- ------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := 'https://xndodghcmedkkaurbnab.supabase.co/functions/v1/send-push';
  v_key text := '{SERVICE_ROLE_KEY}';
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
