-- ============================================================
-- 008: 코트 예약 서버 검증 + 실시간 확대 (재실행 안전)
-- 전제: 001~007 적용 완료 (_award_points, is_admin, lesson_queue 필요)
-- 실행: Supabase SQL Editor 에 전체 붙여넣고 Run
-- ============================================================

-- ---------------------------------------------------------------------------
-- (A) rpc_reserve_court — 코트 예약을 서버가 완전히 검증 + 포인트 원자 차감
--   클라이언트는 절대 status='reserved' / reserved_by 를 직접 못 씀 (아래 트리거로 차단)
--   검증: 승인회원 · 지오펜스(500m, 관리자 예외) · 코트 비어있음 · 중복 코트 금지
--        · 코치코트 자격(레슨 승인 + 순번) · 피크타임 제한 · 랭크 할인 비용 · 잔액
-- ---------------------------------------------------------------------------
create or replace function public.rpc_reserve_court(
  p_court_id int,
  p_game_count int,
  p_game_mode text,
  p_nanta_half text,
  p_players jsonb,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.courts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_profile public.profiles;
  v_court public.courts;
  v_cost int;
  v_base int;
  v_discount numeric;
  v_peak boolean;
  v_hour int;
  v_dist double precision;
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select * into v_profile from public.profiles where id = v_actor for update;
  if not found then raise exception 'profile not found'; end if;
  if v_profile.member_status <> 'approved' then raise exception 'not an approved member'; end if;

  if p_game_count is null or p_game_count < 2 or p_game_count > 6 then
    raise exception 'invalid game count';
  end if;

  -- 지오펜스 (관리자 예외)
  if not v_is_admin then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  -- 코트 잠금 & 비어있는지
  select * into v_court from public.courts where id = p_court_id for update;
  if not found then raise exception 'court not found'; end if;
  if v_court.status <> 'empty' then raise exception 'court not available'; end if;

  -- 이미 다른 코트를 사용/예약 중인지 (본인 기준)
  if exists (
    select 1 from public.courts c
    where c.status <> 'empty'
      and (
        c.reserved_by = v_actor
        or exists (
          select 1 from jsonb_array_elements(c.players) e
          where e->>'userId' = v_actor::text
        )
      )
  ) then
    raise exception 'already has an active court';
  end if;

  -- 코치 코트 자격 (레슨 승인 + 대기열 순번)
  if v_court.is_coach_court and not v_is_admin then
    if v_profile.lesson_status <> 'approved' then
      raise exception 'coach court requires approved lesson access';
    end if;
    if not exists (
      select 1 from public.lesson_queue q
      where q.user_id = v_actor and q.status in ('next', 'active')
    ) then
      raise exception 'not your lesson turn';
    end if;
  end if;

  -- 피크타임 제한 (KST 19·20시, 하루 2회)
  v_hour := extract(hour from (now() at time zone 'Asia/Seoul'));
  v_peak := v_hour in (19, 20);
  if v_peak and v_profile.peak_time_reservations >= 2 and not v_is_admin then
    raise exception 'peak reservation limit reached';
  end if;

  -- 비용 계산 (센터코트 30 / 일반 20, 랭크 할인)
  v_base := case when v_court.is_center then 30 else 20 end;
  v_discount := case v_profile.rank
    when 'gold' then 0.10
    when 'platinum' then 0.17
    when 'diamond' then 0.24
    when 'master' then 0.30
    else 0 end;
  v_cost := greatest(1, round(v_base * (1 - v_discount)));

  if v_profile.points < v_cost and not v_is_admin then
    raise exception 'insufficient points';
  end if;

  -- 포인트 차감 (거래내역 기록) — ref_id 는 rpc_refund_court 와 동일 규칙
  perform public._award_points(
    v_actor, -v_cost, 'court', v_court.name || ' 예약', 'court-' || p_court_id
  );

  -- 피크 카운터 증가
  if v_peak then
    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles
    set peak_time_reservations = peak_time_reservations + 1
    where id = v_actor;
  end if;

  -- 코트 예약 (가드 트리거 우회 GUC)
  perform set_config('app.allow_court_write', 'on', true);
  update public.courts set
    status = 'reserved',
    reserved_by = v_actor,
    reserved_at = now(),
    max_games = p_game_count,
    games_completed = 0,
    players = coalesce(p_players, '[]'::jsonb),
    join_requests = '[]'::jsonb,
    game_mode = nullif(p_game_mode, '')::public.game_mode,
    nanta_half = case
      when p_game_mode = 'nanta' then nullif(p_nanta_half, '')::public.nanta_half
      else null end,
    updated_at = now()
  where id = p_court_id
  returning * into v_court;

  return v_court;
end;
$$;

grant execute on function public.rpc_reserve_court(int, int, text, text, jsonb, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- (B) guard_court_columns — 클라이언트의 코트 직접 조작 차단
--   · 예약 전환(status→reserved) 은 rpc_reserve_court 로만
--   · reserved_by 를 새 값으로 세팅(코트 탈취) 금지
--   · 본인이 참여 중인 코트, 합류신청 추가, just_finished→empty 정리만 허용
--   관리자·서버 RPC(GUC app.allow_court_write='on') 는 전부 통과
-- ---------------------------------------------------------------------------
create or replace function public.guard_court_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_participant boolean;
  v_only_joinreq boolean;
  v_cleanup boolean;
begin
  if public.is_admin() or current_setting('app.allow_court_write', true) = 'on' then
    return new;
  end if;

  -- 예약 전환은 RPC 전용
  if new.status = 'reserved' and old.status is distinct from 'reserved' then
    raise exception 'use rpc_reserve_court to reserve a court';
  end if;

  -- 코트 소유권 탈취 방지 (새 non-null reserved_by 로 변경 불가)
  if new.reserved_by is not null and new.reserved_by is distinct from old.reserved_by then
    raise exception 'cannot claim a court directly';
  end if;

  v_is_participant := (old.reserved_by = v_actor)
    or exists (
      select 1 from jsonb_array_elements(old.players) e
      where e->>'userId' = v_actor::text
    );

  -- 합류 신청 추가처럼 join_requests 만 바뀐 경우
  v_only_joinreq := (new.status = old.status)
    and (new.reserved_by is not distinct from old.reserved_by)
    and (new.players = old.players)
    and (new.games_completed = old.games_completed)
    and (new.max_games = old.max_games);

  -- 종료된 코트 자동 정리
  v_cleanup := (old.status = 'just_finished' and new.status = 'empty');

  if not (v_is_participant or v_only_joinreq or v_cleanup) then
    raise exception 'not allowed to modify this court';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_court_columns_trigger on public.courts;
create trigger guard_court_columns_trigger
  before update on public.courts
  for each row execute function public.guard_court_columns();

-- ---------------------------------------------------------------------------
-- (C) 실시간 발행 확대 — 새로고침 없이 반영
-- ---------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.point_transactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.attendance_records; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.cleaning_submissions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.admin_logs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.match_results; exception when duplicate_object then null; end;
end $$;
