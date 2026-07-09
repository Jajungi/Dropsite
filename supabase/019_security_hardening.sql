-- ============================================================
-- 019: 보안 강화 (재실행 안전)
-- 018 실행 후 Supabase SQL Editor에서 적용
--
-- 막는 항목:
--   · 내부 SECURITY DEFINER 헬퍼 RPC 직접 호출
--   · is_coach / peak_time_reservations / is_at_gym self-update
--   · 알림·경기·출석·청소 RLS 우회
--   · 경기 전적 클라이언트 신뢰 (rpc_sync_match_stats)
--   · 모집방 비밀번호 노출
--   · 정지된 관리자 권한 유지
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) is_admin: 승인된 관리자만
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
    where id = auth.uid()
      and membership_tier = 'admin'
      and member_status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) guard_profile_columns: is_coach, peak_time_reservations, is_at_gym 추가
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_sensitive_profile_write', true), '') = 'on' then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.points is distinct from old.points
     or new.elo is distinct from old.elo
     or new.rank is distinct from old.rank
     or new.wins is distinct from old.wins
     or new.losses is distinct from old.losses
     or new.total_games is distinct from old.total_games
     or new.cleaning_contributions is distinct from old.cleaning_contributions
     or new.membership_tier is distinct from old.membership_tier
     or new.member_status is distinct from old.member_status
     or new.lesson_status is distinct from old.lesson_status
     or new.is_coach is distinct from old.is_coach
     or new.peak_time_reservations is distinct from old.peak_time_reservations
     or new.is_at_gym is distinct from old.is_at_gym
     or new.club_fee_verified_at is distinct from old.club_fee_verified_at
     or new.club_fee_verified_by is distinct from old.club_fee_verified_by
     or new.suspended_at is distinct from old.suspended_at
     or new.suspended_reason is distinct from old.suspended_reason then
    raise exception 'protected profile columns require admin or server RPC';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) 내부 헬퍼: authenticated/anon 직접 실행 차단
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        '_award_points',
        '_admin_reset_courts',
        '_admin_reset_member_stats',
        '_admin_reset_club_metadata',
        '_admin_clear_user_refs',
        '_admin_truncate_activity_tables',
        'trim_point_transactions',
        'trim_match_results',
        'trim_cleaning_submissions',
        'trim_notifications',
        'trim_admin_logs',
        'handle_new_user',
        'guard_profile_columns',
        'guard_court_columns',
        'notify_push_on_insert'
      )
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
    execute format('revoke all on function %s from authenticated', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) 알림: 타인에게는 RPC로만 전송
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check (
    public.is_admin()
    or (user_id = auth.uid() and public.is_approved_member())
  );

create or replace function public.rpc_send_notification(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_kind text default 'system',
  p_court_id int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_approved_member() and not public.is_admin() then
    raise exception 'not approved';
  end if;
  if p_target_user_id is null then
    raise exception 'target required';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'title and message required';
  end if;

  insert into public.notifications (user_id, title, message, kind, court_id)
  values (p_target_user_id, trim(p_title), trim(p_message), coalesce(nullif(trim(p_kind), ''), 'system'), p_court_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_send_notification(uuid, text, text, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) admin_logs: 본인 actor_id 로만 insert (관리자는 자유)
-- ---------------------------------------------------------------------------
drop policy if exists "admin_logs_insert" on public.admin_logs;
create policy "admin_logs_insert"
  on public.admin_logs for insert to authenticated
  with check (
    public.is_admin()
    or (actor_id = auth.uid() and public.is_approved_member())
  );

-- ---------------------------------------------------------------------------
-- 6) 출석·청소: 클라이언트 직접 insert 차단 (RPC 전용)
-- ---------------------------------------------------------------------------
drop policy if exists "attendance_insert_own" on public.attendance_records;
create policy "attendance_insert_blocked"
  on public.attendance_records for insert to authenticated
  with check (false);

drop policy if exists "cleaning_insert" on public.cleaning_submissions;
create policy "cleaning_insert_blocked"
  on public.cleaning_submissions for insert to authenticated
  with check (false);

-- ---------------------------------------------------------------------------
-- 7) 관리자 대리 출석 RPC
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_check_in(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tier public.membership_tier;
  v_status public.member_status;
  v_pts int;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_admin() then raise exception 'admin only'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  if exists (
    select 1 from public.attendance_records
    where user_id = p_user_id and date = current_date
  ) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (p_user_id, current_date);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(p_user_id, v_pts, 'attendance', '관리자 대리 출석', null);

  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true, updated_at = now() where id = p_user_id;

  return v_pts;
end;
$$;

grant execute on function public.rpc_admin_check_in(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) 경기 RLS: 참가자만 insert, update는 참가자(대기) 또는 관리자
-- ---------------------------------------------------------------------------
drop policy if exists "match_results_insert" on public.match_results;
create policy "match_results_insert"
  on public.match_results for insert to authenticated
  with check (
    public.is_admin()
    or auth.uid() = any(coalesce(team_a, '{}'))
    or auth.uid() = any(coalesce(team_b, '{}'))
  );

drop policy if exists "match_results_update" on public.match_results;
create policy "match_results_update"
  on public.match_results for update to authenticated
  using (
    public.is_admin()
    or (
      status = 'pending'
      and (
        auth.uid() = any(coalesce(team_a, '{}'))
        or auth.uid() = any(coalesce(team_b, '{}'))
      )
    )
    or (
      auth.uid() = any(coalesce(team_a, '{}'))
      or auth.uid() = any(coalesce(team_b, '{}'))
    )
  )
  with check (
    public.is_admin()
    or auth.uid() = any(coalesce(team_a, '{}'))
    or auth.uid() = any(coalesce(team_b, '{}'))
  );

-- ---------------------------------------------------------------------------
-- 9) 경기 전적: 서버가 match row 기준으로만 반영 (클라이언트 JSON 신뢰 제거)
-- ---------------------------------------------------------------------------
alter table public.match_results
  add column if not exists stats_applied boolean not null default false;

alter table public.profiles
  add column if not exists peak_reset_date date;

create or replace function public.rank_from_elo(p_elo int)
returns public.rank_tier
language sql
immutable
as $$
  select case
    when p_elo >= 1800 then 'master'::public.rank_tier
    when p_elo >= 1600 then 'diamond'::public.rank_tier
    when p_elo >= 1400 then 'platinum'::public.rank_tier
    when p_elo >= 1200 then 'gold'::public.rank_tier
    when p_elo >= 1000 then 'silver'::public.rank_tier
    else 'bronze'::public.rank_tier
  end;
$$;

revoke all on function public.rank_from_elo(int) from public;
revoke all on function public.rank_from_elo(int) from anon;
revoke all on function public.rank_from_elo(int) from authenticated;

create or replace function public.rpc_sync_match_stats(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.match_results;
  v_actor uuid := auth.uid();
  v_participants uuid[];
  v_winners uuid[];
  v_losers uuid[];
  v_uid uuid;
  v_delta int;
  v_elo int;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  select * into v_match from public.match_results where id = p_match_id for update;
  if not found then
    raise exception 'match not found';
  end if;

  v_participants := coalesce(v_match.team_a, '{}') || coalesce(v_match.team_b, '{}');
  if not (public.is_admin() or v_actor = any(v_participants)) then
    raise exception 'forbidden';
  end if;

  if v_match.status = 'confirmed' and not v_match.stats_applied then
    if v_match.elo_changes is null then
      raise exception 'elo_changes missing';
    end if;

    v_winners := case when v_match.winner = 'A' then v_match.team_a else v_match.team_b end;
    v_losers := case when v_match.winner = 'A' then v_match.team_b else v_match.team_a end;

    foreach v_uid in array v_participants loop
      v_delta := coalesce((v_match.elo_changes->>v_uid::text)::int, 0);
      select elo into v_elo from public.profiles where id = v_uid;
      if not found then
        raise exception 'participant profile missing';
      end if;
      v_elo := v_elo + v_delta;

      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles
      set
        elo = v_elo,
        rank = public.rank_from_elo(v_elo),
        wins = wins + case when v_uid = any(v_winners) then 1 else 0 end,
        losses = losses + case when v_uid = any(v_losers) then 1 else 0 end,
        total_games = total_games + 1,
        updated_at = now()
      where id = v_uid;
    end loop;

    update public.match_results set stats_applied = true where id = p_match_id;

  elsif v_match.status = 'revoked' and v_match.stats_applied then
    v_winners := case when v_match.winner = 'A' then v_match.team_a else v_match.team_b end;
    v_losers := case when v_match.winner = 'A' then v_match.team_b else v_match.team_a end;

    foreach v_uid in array v_participants loop
      v_delta := coalesce((v_match.elo_changes->>v_uid::text)::int, 0);
      select elo into v_elo from public.profiles where id = v_uid;
      if not found then continue; end if;
      v_elo := v_elo - v_delta;

      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles
      set
        elo = v_elo,
        rank = public.rank_from_elo(v_elo),
        wins = greatest(0, wins - case when v_uid = any(v_winners) then 1 else 0 end),
        losses = greatest(0, losses - case when v_uid = any(v_losers) then 1 else 0 end),
        total_games = greatest(0, total_games - 1),
        updated_at = now()
      where id = v_uid;
    end loop;

    update public.match_results set stats_applied = false where id = p_match_id;
  end if;
end;
$$;

revoke all on function public.rpc_sync_match_stats(uuid, jsonb) from public;
revoke all on function public.rpc_sync_match_stats(uuid, jsonb) from anon;
revoke all on function public.rpc_sync_match_stats(uuid, jsonb) from authenticated;
drop function if exists public.rpc_sync_match_stats(uuid, jsonb);

grant execute on function public.rpc_sync_match_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) 피크타임 리셋: 하루 1회만 (서울 기준)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_reset_peak_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (timezone('Asia/Seoul', now()))::date;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_actor and peak_reset_date = v_today
  ) then
    return;
  end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles
  set peak_time_reservations = 0, peak_reset_date = v_today, updated_at = now()
  where id = v_actor;
end;
$$;

grant execute on function public.rpc_reset_peak_reservations() to authenticated;

-- ---------------------------------------------------------------------------
-- 11) 모집방: 비밀번호 컬럼 SELECT 차단 + 공개 뷰 + 검증 RPC
-- ---------------------------------------------------------------------------
create or replace view public.team_rooms_public
with (security_invoker = true) as
select
  id,
  host_id,
  host_name,
  title,
  min_rank,
  max_rank,
  members,
  min_members,
  max_members,
  status,
  created_at,
  (password is not null and length(password) > 0) as has_password
from public.team_rooms;

grant select on public.team_rooms_public to authenticated;

revoke select on public.team_rooms from authenticated;
revoke select on public.team_rooms from anon;

create or replace function public.rpc_verify_team_room_password(
  p_room_id uuid,
  p_password text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pw text;
begin
  if auth.uid() is null then return false; end if;
  select password into v_pw from public.team_rooms where id = p_room_id;
  if not found then return false; end if;
  if v_pw is null or length(v_pw) = 0 then return true; end if;
  return v_pw = coalesce(p_password, '');
end;
$$;

grant execute on function public.rpc_verify_team_room_password(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12) rpc_adjust_points: 006 버전 유지 확인 (양수 적립 차단)
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
  v_is_admin boolean := public.is_admin();
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if p_user_id <> v_actor and not v_is_admin then
    raise exception 'can only adjust own points unless admin';
  end if;

  if p_delta > 0 and not v_is_admin then
    raise exception 'earning points requires a validated action (use dedicated RPC)';
  end if;

  if p_kind = 'admin' and not v_is_admin then
    raise exception 'admin only';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);

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
