-- ============================================================
-- 011: 관리자 DB 리셋 RPC (재실행 안전)
-- 앱 관리자 탭 → 시스템 에서 호출
-- 실행: Supabase SQL Editor 에 전체 붙여넣고 Run
-- ============================================================

-- 코트 상태 초기화 (내부 헬퍼)
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
    updated_at      = now();
end;
$$;

-- 회원 통계 초기화 (내부 헬퍼)
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
    updated_at             = now();
end;
$$;

-- 클럽 메타데이터 초기화 (내부 헬퍼)
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

-- 활동/거래 테이블 비우기 (내부 헬퍼)
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

-- ---------------------------------------------------------------------------
-- rpc_admin_reset_data
--   p_scope:
--     full                — 모든 계정 + 모든 데이터 삭제
--     activity_stats      — 계정 유지, 통계·코트·활동 기록 전부 초기화
--     courts              — 코트 예약·경기 상태만 초기화
--     matches             — 경기 기록만 삭제
--     attendance          — 출석·청소 제출 기록만 삭제
--     points              — 포인트 거래내역 삭제 + 모든 포인트 0
--     social              — 친구·로비·코치공지·레슨대기 삭제
--     notifications_logs  — 알림·관리자 로그만 삭제
--     guests              — 게스트 계정만 삭제
--     pending_members     — 승인 대기 계정만 삭제
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_reset_data(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_deleted_users int := 0;
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
      update public.profiles set points = 0, updated_at = now();

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
      delete from auth.users
      where id in (
        select id from public.profiles where membership_tier = 'guest'
      );
      get diagnostics v_deleted_users = row_count;

    when 'pending_members' then
      perform public._admin_reset_courts();
      delete from auth.users
      where id in (
        select id from public.profiles where member_status = 'pending'
      );
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
      delete from auth.users;
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
