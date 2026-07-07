-- ============================================================
-- 014: DB 안전성 통합 패치 (재실행 안전)
-- Supabase "UPDATE requires a WHERE clause" / 계정 삭제 FK 오류 방지
--
-- 아래 중 하나만 실행하면 됩니다 (권장: 이 파일만):
--   supabase/014_db_safety_hardening.sql
--
-- 포함: _admin_clear_user_refs, 관리자 리셋 RPC, 계정 삭제 RPC
-- ============================================================

-- 삭제 대상 회원을 참조하는 RESTRICT FK 정리 (공용 헬퍼)
create or replace function public._admin_clear_user_refs(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;

  perform set_config('app.allow_court_write', 'on', true);
  perform set_config('app.allow_sensitive_profile_write', 'on', true);

  update public.courts
  set reserved_by = null,
      status = 'empty',
      players = '[]'::jsonb,
      join_requests = '[]'::jsonb,
      reserved_at = null,
      started_at = null,
      finished_at = null,
      games_completed = 0,
      game_mode = null,
      nanta_half = null,
      updated_at = now()
  where reserved_by = any(p_ids);

  update public.match_results set confirmed_by = null where confirmed_by = any(p_ids);
  update public.match_results set cancelled_by = null where cancelled_by = any(p_ids);
  update public.point_transactions set created_by = null where created_by = any(p_ids);
  update public.cleaning_submissions set revoked_by = null where revoked_by = any(p_ids);
  update public.admin_logs set actor_id = null where actor_id = any(p_ids);
  update public.profiles set club_fee_verified_by = null where club_fee_verified_by = any(p_ids);
end;
$$;

-- 코트 상태 초기화
create or replace function public._admin_reset_courts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_court_write', 'on', true);
  update public.courts set
    status          = 'empty',
    players         = '[]'::jsonb,
    join_requests   = '[]'::jsonb,
    games_completed = 0,
    reserved_by     = null,
    reserved_at     = null,
    started_at      = null,
    finished_at     = null,
    game_mode       = null,
    nanta_half      = null,
    updated_at      = now()
  where id is not null;
end;
$$;

-- 회원 통계 초기화
create or replace function public._admin_reset_member_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set
    elo                    = 1000,
    rank                   = 'bronze',
    points                 = 0,
    wins                   = 0,
    losses                 = 0,
    total_games            = 0,
    cleaning_contributions = 0,
    peak_time_reservations = 0,
    is_at_gym              = false,
    schedule_date          = null,
    scheduled_start        = null,
    scheduled_end          = null,
    lesson_status          = 'none',
    lesson_requested_at    = null,
    updated_at             = now()
  where id is not null;
end;
$$;

-- 클럽 메타데이터 초기화
create or replace function public._admin_reset_club_metadata()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.club_metadata set
    peak_reset_date           = null,
    last_cleaning_bonus_month = null,
    updated_at                = now()
  where id = 1;
end;
$$;

-- 활동/거래 테이블 비우기
create or replace function public._admin_truncate_activity_tables()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    public.point_transactions,
    public.match_results,
    public.attendance_records,
    public.cleaning_submissions,
    public.notifications,
    public.admin_logs,
    public.friend_requests,
    public.coach_announcements,
    public.lesson_queue,
    public.team_rooms
  cascade;
end;
$$;

-- 관리자 DB 리셋 (앱 관리자 탭 → 시스템)
create or replace function public.rpc_admin_reset_data(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_deleted_users int := 0;
  v_ids uuid[];
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  case p_scope
    when 'courts' then
      perform public._admin_reset_courts();

    when 'matches' then
      truncate table public.match_results cascade;

    when 'attendance' then
      truncate table public.attendance_records, public.cleaning_submissions cascade;

    when 'points' then
      truncate table public.point_transactions cascade;
      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles set points = 0, updated_at = now() where id is not null;

    when 'social' then
      truncate table
        public.friend_requests,
        public.coach_announcements,
        public.lesson_queue,
        public.team_rooms
      cascade;

    when 'notifications_logs' then
      truncate table public.notifications, public.admin_logs cascade;

    when 'guests' then
      perform public._admin_reset_courts();
      select array_agg(id) into v_ids
      from public.profiles where membership_tier = 'guest';
      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id = any(coalesce(v_ids, '{}'::uuid[]));
      get diagnostics v_deleted_users = row_count;

    when 'pending_members' then
      perform public._admin_reset_courts();
      select array_agg(id) into v_ids
      from public.profiles where member_status = 'pending';
      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id = any(coalesce(v_ids, '{}'::uuid[]));
      get diagnostics v_deleted_users = row_count;

    when 'activity_stats' then
      perform public._admin_reset_courts();
      perform public._admin_truncate_activity_tables();
      perform public._admin_reset_member_stats();
      perform public._admin_reset_club_metadata();

    when 'full' then
      perform public._admin_reset_courts();
      perform public._admin_truncate_activity_tables();
      perform public._admin_reset_club_metadata();
      select array_agg(id) into v_ids from public.profiles;
      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id is not null;
      get diagnostics v_deleted_users = row_count;

    else
      raise exception 'unknown reset scope: %', p_scope;
  end case;

  return jsonb_build_object(
    'scope', p_scope,
    'deleted_users', v_deleted_users,
    'ok', true
  );
end;
$$;

revoke all on function public.rpc_admin_reset_data(text) from public;
grant execute on function public.rpc_admin_reset_data(text) to authenticated;

-- 본인 또는 관리자 계정 삭제
create or replace function public.rpc_delete_account(p_target_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid := coalesce(p_target_id, v_actor);
  v_tier public.membership_tier;
  v_admin_count int;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if v_target <> v_actor and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select membership_tier into v_tier
  from public.profiles
  where id = v_target;

  if not found then
    raise exception 'user not found';
  end if;

  if v_tier = 'admin' then
    select count(*)::int into v_admin_count
    from public.profiles
    where membership_tier = 'admin' and member_status = 'approved';
    if v_admin_count <= 1 then
      raise exception 'cannot delete last admin';
    end if;
  end if;

  perform public._admin_clear_user_refs(ARRAY[v_target]);
  delete from auth.users where id = v_target;
end;
$$;

grant execute on function public.rpc_delete_account(uuid) to authenticated;
