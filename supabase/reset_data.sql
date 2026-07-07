-- ============================================================================
--  DB 데이터 리셋 스크립트
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--  ⚠️ 되돌릴 수 없습니다. 실행 전 반드시 확인하세요.
--
--  아래 두 가지 중 "원하는 옵션 하나"만 골라 그 블록만 실행하세요.
--    - 옵션 A: 계정까지 전부 삭제 (완전 초기화 / 배포 직전 청소용)
--    - 옵션 B: 계정은 유지하고 활동 데이터·통계만 초기화
-- ============================================================================


-- ============================================================================
--  옵션 A) 완전 초기화 — 모든 사용자 계정 + 모든 데이터 삭제
--  (관리자 계정도 삭제됩니다. 실행 후 다시 회원가입하고 관리자 권한을 부여해야 함)
-- ============================================================================
begin;

  -- 1) 코트를 빈 상태로 되돌림 (reserved_by가 profiles를 참조하므로 계정 삭제 전에 먼저 정리)
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

  -- 2) 모든 활동/거래 데이터 삭제
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

  -- 3) 클럽 메타데이터 초기화
  update public.club_metadata set
    peak_reset_date           = null,
    last_cleaning_bonus_month = null,
    updated_at                = now()
  where id = 1;

  -- 4) 모든 인증 계정 삭제 → profiles로 CASCADE 삭제됨
  delete from auth.users where id is not null;

commit;

-- ⚠️ 옵션 A 실행 후 할 일:
--   1. 앱에서 다시 회원가입(첫 사용자).
--   2. 아래로 그 사용자를 관리자로 승격:
--        update public.profiles
--          set membership_tier = 'admin', member_status = 'approved'
--        where student_id = '여기에_본인_학번';
--   3. Storage의 avatars 버킷 파일은 SQL로 지워지지 않습니다.
--      대시보드 → Storage → avatars 에서 수동 삭제하거나 그냥 두어도 됩니다.


-- ============================================================================
--  옵션 B) 활동 데이터만 초기화 — 계정은 유지, 포인트·전적·통계만 리셋
--  (관리자 계정과 회원 목록은 그대로 남습니다)
-- ============================================================================
-- begin;
--
--   -- 1) 코트 빈 상태로
--   update public.courts set
--     status = 'empty', players = '[]'::jsonb, join_requests = '[]'::jsonb,
--     games_completed = 0, reserved_by = null, reserved_at = null,
--     started_at = null, finished_at = null, game_mode = null,
--     nanta_half = null, updated_at = now()
--   where id is not null;
--
--   -- 2) 활동/거래 데이터 삭제
--   truncate table
--     public.point_transactions,
--     public.match_results,
--     public.attendance_records,
--     public.cleaning_submissions,
--     public.notifications,
--     public.admin_logs,
--     public.friend_requests,
--     public.coach_announcements,
--     public.lesson_queue,
--     public.team_rooms
--   cascade;
--
--   -- 3) 회원 통계 리셋 (계정/권한/승인상태는 유지)
--   update public.profiles set
--     elo                    = 1000,
--     rank                   = 'bronze',
--     points                 = 0,
--     wins                   = 0,
--     losses                 = 0,
--     total_games            = 0,
--     cleaning_contributions = 0,
--     peak_time_reservations = 0,
--     is_at_gym              = false,
--     schedule_date          = null,
--     scheduled_start        = null,
--     scheduled_end          = null,
--     lesson_status          = 'none',
--     lesson_requested_at    = null,
--     updated_at             = now()
--   where id is not null;
--
--   -- 4) 클럽 메타데이터 초기화
--   update public.club_metadata set
--     peak_reset_date = null, last_cleaning_bonus_month = null, updated_at = now()
--   where id = 1;
--
-- commit;
