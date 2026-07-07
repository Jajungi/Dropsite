-- ============================================================
-- Drop 배드민턴 — 전체 스키마 (재실행 안전 / idempotent)
-- Supabase SQL Editor에 이 파일 "전체"를 붙여넣고 Run 하세요.
-- 몇 번을 다시 돌려도 오류 없이 동작합니다.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (이미 있으면 건너뜀)
-- ---------------------------------------------------------------------------
do $$ begin create type public.membership_tier as enum ('guest', 'associate', 'full', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.member_status as enum ('pending', 'approved', 'rejected', 'suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.lesson_access_status as enum ('none', 'pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.rank_tier as enum ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'); exception when duplicate_object then null; end $$;
do $$ begin create type public.court_status as enum ('empty', 'reserved', 'playing', 'just_finished'); exception when duplicate_object then null; end $$;
do $$ begin create type public.game_mode as enum ('nanta', 'casual', 'ranked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.nanta_half as enum ('near', 'far'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('pending', 'confirmed', 'cancelled', 'revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.friend_request_status as enum ('pending', 'accepted', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.lesson_app_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.team_room_status as enum ('open', 'ready', 'reserved', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.lesson_queue_status as enum ('waiting', 'next', 'active', 'done'); exception when duplicate_object then null; end $$;
do $$ begin create type public.point_tx_kind as enum ('earn', 'spend', 'admin', 'revoke', 'club_fee', 'attendance', 'cleaning', 'net_setup', 'court', 'shuttlecock', 'ranked_win', 'bonus'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (auth.users 1:1) — helpers보다 먼저 생성
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique not null,
  name text not null,
  nickname text not null default '',
  email text not null default '',
  membership_tier public.membership_tier not null default 'guest',
  member_status public.member_status not null default 'pending',
  rank public.rank_tier not null default 'bronze',
  elo int not null default 1000 check (elo >= 0),
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  total_games int not null default 0,
  cleaning_contributions int not null default 0,
  peak_time_reservations int not null default 0,
  is_at_gym boolean not null default false,
  schedule_date date,
  scheduled_start time,
  scheduled_end time,
  lesson_status public.lesson_access_status not null default 'none',
  lesson_requested_at timestamptz,
  avatar_color text not null default '#4A90D9',
  avatar_path text,
  admin_note text,
  club_fee_verified_at timestamptz,
  club_fee_verified_by uuid references public.profiles(id),
  suspended_reason text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_student_id_idx on public.profiles (student_id);
create index if not exists profiles_member_status_idx on public.profiles (member_status);

-- 신규 Auth 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id text;
  v_name text;
  v_email text;
begin
  v_student_id := coalesce(new.raw_user_meta_data->>'student_id', split_part(new.email, '@', 1));
  v_name := coalesce(new.raw_user_meta_data->>'name', v_student_id);
  v_email := coalesce(new.raw_user_meta_data->>'contact_email', '');

  insert into public.profiles (id, student_id, name, nickname, email)
  values (new.id, v_student_id, v_name, v_name, v_email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers (profiles 테이블 생성 후)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and membership_tier = 'admin'
  );
$$;

create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and member_status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- Club metadata (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.club_metadata (
  id int primary key default 1 check (id = 1),
  peak_reset_date date,
  last_cleaning_bonus_month text,
  updated_at timestamptz not null default now()
);

insert into public.club_metadata (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Courts (9 fixed rows)
-- ---------------------------------------------------------------------------
create table if not exists public.courts (
  id int primary key,
  name text not null,
  is_center boolean not null default false,
  is_coach_court boolean not null default false,
  status public.court_status not null default 'empty',
  players jsonb not null default '[]'::jsonb,
  join_requests jsonb not null default '[]'::jsonb,
  games_completed int not null default 0,
  max_games int not null default 3,
  reserved_by uuid references public.profiles(id),
  reserved_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  game_mode public.game_mode,
  nanta_half public.nanta_half,
  updated_at timestamptz not null default now()
);

insert into public.courts (id, name, is_center, is_coach_court) values
  (1, '1코트', false, false),
  (2, '2코트', false, false),
  (3, '코치코트', false, true),
  (4, '4코트', true, false),
  (5, '5코트', true, false),
  (6, '6코트', true, false),
  (7, '7코트', false, false),
  (8, '8코트', false, false),
  (9, '9코트', false, false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Point transactions
-- ---------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  balance_after int not null,
  kind public.point_tx_kind not null default 'earn',
  reason text not null default '',
  ref_id text,
  created_by uuid references public.profiles(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists point_tx_user_created_idx on public.point_transactions (user_id, created_at desc);

-- 보존: 사용자당 최근 40건
create or replace function public.trim_point_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.point_transactions
  where id in (
    select id from public.point_transactions
    where user_id = new.user_id
    order by created_at desc
    offset 40
  );
  return new;
end;
$$;

drop trigger if exists trim_point_transactions_trigger on public.point_transactions;
create trigger trim_point_transactions_trigger
  after insert on public.point_transactions
  for each row execute function public.trim_point_transactions();

-- ---------------------------------------------------------------------------
-- Match results
-- ---------------------------------------------------------------------------
create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  court_id int references public.courts(id),
  team_a uuid[] not null default '{}',
  team_b uuid[] not null default '{}',
  score_a int not null default 0,
  score_b int not null default 0,
  winner text not null check (winner in ('A', 'B')),
  status public.match_status not null default 'pending',
  played_at timestamptz not null default now(),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancel_reason text,
  elo_changes jsonb,
  game_mode public.game_mode,
  created_at timestamptz not null default now()
);

create index if not exists match_results_played_at_idx on public.match_results (played_at desc);

-- 보존: 전체 최근 50건
create or replace function public.trim_match_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.match_results
  where id in (
    select id from public.match_results
    order by played_at desc
    offset 50
  );
  return new;
end;
$$;

drop trigger if exists trim_match_results_trigger on public.match_results;
create trigger trim_match_results_trigger
  after insert on public.match_results
  for each row execute function public.trim_match_results();

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  checked_in_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists attendance_user_date_idx on public.attendance_records (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Cleaning submissions
-- ---------------------------------------------------------------------------
create table if not exists public.cleaning_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  kind text not null default 'cleaning',
  area text not null,
  participant_count int not null default 1,
  points int not null default 0,
  submitted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id)
);

-- 보존: 90일
create or replace function public.trim_cleaning_submissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cleaning_submissions
  where submitted_at < now() - interval '90 days';
  return new;
end;
$$;

drop trigger if exists trim_cleaning_submissions_trigger on public.cleaning_submissions;
create trigger trim_cleaning_submissions_trigger
  after insert on public.cleaning_submissions
  for each row execute function public.trim_cleaning_submissions();

-- ---------------------------------------------------------------------------
-- Notifications (inbox)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null default '',
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

create or replace function public.trim_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where id in (
    select id from public.notifications
    where user_id = new.user_id
    order by created_at desc
    offset 20
  );
  return new;
end;
$$;

drop trigger if exists trim_notifications_trigger on public.notifications;
create trigger trim_notifications_trigger
  after insert on public.notifications
  for each row execute function public.trim_notifications();

-- ---------------------------------------------------------------------------
-- Admin logs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  message text not null default '',
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);

create index if not exists admin_logs_created_idx on public.admin_logs (created_at desc);

create or replace function public.trim_admin_logs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_logs
  where id in (
    select id from public.admin_logs
    order by created_at desc
    offset 200
  );
  return new;
end;
$$;

drop trigger if exists trim_admin_logs_trigger on public.admin_logs;
create trigger trim_admin_logs_trigger
  after insert on public.admin_logs
  for each row execute function public.trim_admin_logs();

-- ---------------------------------------------------------------------------
-- RPC: 포인트 변경 (관리자·시스템)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_adjust_points(
  p_user_id uuid,
  p_delta int,
  p_kind public.point_tx_kind,
  p_reason text,
  p_ref_id text default null
)
returns public.point_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_tx public.point_transactions;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if p_kind = 'admin' and not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  update public.profiles
  set points = greatest(0, v_profile.points + p_delta), updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  insert into public.point_transactions (user_id, delta, balance_after, kind, reason, ref_id, created_by)
  values (p_user_id, p_delta, v_profile.points, p_kind, p_reason, p_ref_id, v_actor)
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.rpc_adjust_points(uuid, int, public.point_tx_kind, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: 프로필 아바타 경로
-- ---------------------------------------------------------------------------
create or replace function public.rpc_set_avatar_path(p_path text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set avatar_path = p_path, updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.rpc_set_avatar_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.club_metadata enable row level security;
alter table public.courts enable row level security;
alter table public.point_transactions enable row level security;
alter table public.match_results enable row level security;
alter table public.attendance_records enable row level security;
alter table public.cleaning_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_approved" on public.profiles;
create policy "profiles_select_approved"
  on public.profiles for select to authenticated
  using (public.is_approved_member() or id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- club_metadata
drop policy if exists "club_metadata_select" on public.club_metadata;
create policy "club_metadata_select"
  on public.club_metadata for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "club_metadata_admin" on public.club_metadata;
create policy "club_metadata_admin"
  on public.club_metadata for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- courts
drop policy if exists "courts_select" on public.courts;
create policy "courts_select"
  on public.courts for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "courts_update_members" on public.courts;
create policy "courts_update_members"
  on public.courts for update to authenticated
  using (public.is_approved_member() or public.is_admin())
  with check (public.is_approved_member() or public.is_admin());

-- point_transactions
drop policy if exists "point_tx_select_own" on public.point_transactions;
create policy "point_tx_select_own"
  on public.point_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "point_tx_no_direct_insert" on public.point_transactions;
create policy "point_tx_no_direct_insert"
  on public.point_transactions for insert to authenticated
  with check (false);

-- match_results
drop policy if exists "match_results_select" on public.match_results;
create policy "match_results_select"
  on public.match_results for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "match_results_insert" on public.match_results;
create policy "match_results_insert"
  on public.match_results for insert to authenticated
  with check (public.is_approved_member() or public.is_admin());

drop policy if exists "match_results_update" on public.match_results;
create policy "match_results_update"
  on public.match_results for update to authenticated
  using (public.is_approved_member() or public.is_admin());

-- attendance
drop policy if exists "attendance_select" on public.attendance_records;
create policy "attendance_select"
  on public.attendance_records for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendance_insert_own" on public.attendance_records;
create policy "attendance_insert_own"
  on public.attendance_records for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- cleaning
drop policy if exists "cleaning_select" on public.cleaning_submissions;
create policy "cleaning_select"
  on public.cleaning_submissions for select to authenticated
  using (public.is_approved_member() or public.is_admin());

drop policy if exists "cleaning_insert" on public.cleaning_submissions;
create policy "cleaning_insert"
  on public.cleaning_submissions for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- admin_logs
drop policy if exists "admin_logs_admin" on public.admin_logs;
create policy "admin_logs_admin"
  on public.admin_logs for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime (이미 추가돼 있으면 무시)
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.courts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
