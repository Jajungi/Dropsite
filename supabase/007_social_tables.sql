-- ============================================================
-- 007: 소셜/실시간 테이블 (친구·코치공지·레슨대기열·모집방) — 재실행 안전
-- 실행: Supabase SQL Editor 에 전체 붙여넣고 Run
-- 전제: 001~006 이 먼저 적용되어 있어야 함 (is_admin(), is_approved_member())
-- ============================================================

-- ---------------------------------------------------------------------------
-- 친구 신청 (친구 관계는 status='accepted' 행에서 파생)
-- ---------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  from_user_name text not null,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists friend_requests_to_idx on public.friend_requests (to_user_id, status);
create index if not exists friend_requests_from_idx on public.friend_requests (from_user_id, status);

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_select" on public.friend_requests;
create policy "friend_requests_select" on public.friend_requests for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

drop policy if exists "friend_requests_insert" on public.friend_requests;
create policy "friend_requests_insert" on public.friend_requests for insert to authenticated
  with check (from_user_id = auth.uid() and public.is_approved_member());

drop policy if exists "friend_requests_update" on public.friend_requests;
create policy "friend_requests_update" on public.friend_requests for update to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

drop policy if exists "friend_requests_delete" on public.friend_requests;
create policy "friend_requests_delete" on public.friend_requests for delete to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 코치 공지
-- ---------------------------------------------------------------------------
create table if not exists public.coach_announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  title text not null,
  message text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists coach_announcements_created_idx on public.coach_announcements (created_at desc);

alter table public.coach_announcements enable row level security;

drop policy if exists "coach_announcements_select" on public.coach_announcements;
create policy "coach_announcements_select" on public.coach_announcements for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "coach_announcements_write" on public.coach_announcements;
create policy "coach_announcements_write" on public.coach_announcements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 레슨 대기열 (코치 코트 순번)
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  position int not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'next', 'active', 'done')),
  joined_at timestamptz not null default now()
);
create index if not exists lesson_queue_status_idx on public.lesson_queue (status, position);

alter table public.lesson_queue enable row level security;

drop policy if exists "lesson_queue_select" on public.lesson_queue;
create policy "lesson_queue_select" on public.lesson_queue for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "lesson_queue_insert" on public.lesson_queue;
create policy "lesson_queue_insert" on public.lesson_queue for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lesson_status = 'approved')
  );

drop policy if exists "lesson_queue_update" on public.lesson_queue;
create policy "lesson_queue_update" on public.lesson_queue for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lesson_queue_delete" on public.lesson_queue;
create policy "lesson_queue_delete" on public.lesson_queue for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 파트너 모집방 (로비)
-- ---------------------------------------------------------------------------
create table if not exists public.team_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  host_name text not null,
  title text not null,
  min_rank text,
  max_rank text,
  members jsonb not null default '[]'::jsonb,
  min_members int not null default 2,
  max_members int not null default 4,
  status text not null default 'open' check (status in ('open', 'ready', 'reserved', 'closed')),
  password text,
  created_at timestamptz not null default now()
);
create index if not exists team_rooms_created_idx on public.team_rooms (created_at desc);

alter table public.team_rooms enable row level security;

drop policy if exists "team_rooms_select" on public.team_rooms;
create policy "team_rooms_select" on public.team_rooms for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "team_rooms_insert" on public.team_rooms;
create policy "team_rooms_insert" on public.team_rooms for insert to authenticated
  with check (host_id = auth.uid() and public.is_approved_member());

-- 참여/나가기는 members(jsonb) 갱신이 필요하므로 승인회원이면 update 허용 (코트와 동일 신뢰모델)
drop policy if exists "team_rooms_update" on public.team_rooms;
create policy "team_rooms_update" on public.team_rooms for update to authenticated
  using (public.is_approved_member() or public.is_admin())
  with check (public.is_approved_member() or public.is_admin());

drop policy if exists "team_rooms_delete" on public.team_rooms;
create policy "team_rooms_delete" on public.team_rooms for delete to authenticated
  using (host_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime 발행
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.friend_requests;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.coach_announcements;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.lesson_queue;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.team_rooms;
  exception when duplicate_object then null; end;
end $$;
