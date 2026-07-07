-- ============================================================
-- 006: 포인트 경제 서버 검증 (재실행 안전)
-- 목표: 일반 사용자가 자기 포인트를 임의로 적립하지 못하게 막고,
--       정당한 적립(출석·청소·예약 환불)은 서버가 금액을 강제하는 RPC로만 처리.
-- 실행: Supabase SQL Editor 에 전체 붙여넣고 Run
-- ============================================================

-- ---------------------------------------------------------------------------
-- rpc_adjust_points: 일반 사용자는 "본인 포인트 차감(음수)"만 가능.
--   - 본인에게 적립(양수)은 관리자 또는 아래 전용 RPC 로만 가능
--   - 타인 포인트 변경은 관리자만
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

  -- 핵심 보안: 본인에게 포인트 적립(양수)은 관리자만. 일반 사용자는 차감(음수)만 허용.
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

-- ---------------------------------------------------------------------------
-- 내부 헬퍼: 포인트 적립 + 거래내역 기록 (definer 컨텍스트에서만 호출)
-- ---------------------------------------------------------------------------
create or replace function public._award_points(
  p_user_id uuid,
  p_delta int,
  p_kind public.point_tx_kind,
  p_reason text,
  p_ref_id text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles
  set points = greatest(0, points + p_delta), updated_at = now()
  where id = p_user_id
  returning points into v_balance;

  insert into public.point_transactions (user_id, delta, balance_after, kind, reason, ref_id, created_by)
  values (p_user_id, p_delta, v_balance, p_kind, p_reason, p_ref_id, p_user_id);

  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_check_in: 출석 인증 (서버가 지오펜스·중복·포인트 검증)
--   반경 500m(관리자는 예외). 하루 1회. 정회원/관리자 +150, 그 외 +100
-- ---------------------------------------------------------------------------
create or replace function public.rpc_check_in(p_lat double precision, p_lng double precision)
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
  v_dist double precision;
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = v_actor;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  -- 지오펜스 (관리자는 예외)
  if v_tier <> 'admin' then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  -- 하루 1회 (unique(user_id,date) 로도 방어)
  if exists (select 1 from public.attendance_records where user_id = v_actor and date = current_date) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (v_actor, current_date);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(v_actor, v_pts, 'attendance', '체육관 출석 인증 (500m 내)', null);
  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true where id = v_actor;

  return v_pts;
end;
$$;

grant execute on function public.rpc_check_in(double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_submit_cleaning: 청소/네트/콕 운반 인증 (서버가 포인트 금액 강제)
--   kind: 'cleaning' | 'net_setup' → 각 +100
-- ---------------------------------------------------------------------------
create or replace function public.rpc_submit_cleaning(
  p_kind text,
  p_area text,
  p_participants int
)
returns public.cleaning_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name text;
  v_status public.member_status;
  v_pts int;
  v_kind text;
  v_row public.cleaning_submissions;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select name, member_status into v_name, v_status from public.profiles where id = v_actor;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  v_kind := case when p_kind = 'net_setup' then 'net_setup' else 'cleaning' end;
  v_pts := 100; -- CLEANING = NET_SETUP = 100 (서버 강제)

  insert into public.cleaning_submissions (user_id, user_name, kind, area, participant_count, points)
  values (v_actor, coalesce(v_name, '회원'), v_kind, p_area, greatest(1, coalesce(p_participants, 1)), v_pts)
  returning * into v_row;

  perform public._award_points(v_actor, v_pts, v_kind::public.point_tx_kind, v_kind || ' 인증 · ' || p_area, v_row.id::text);

  -- 청소는 기여 카운트 증가
  if v_kind = 'cleaning' then
    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles set cleaning_contributions = cleaning_contributions + 1 where id = v_actor;
  end if;

  return v_row;
end;
$$;

grant execute on function public.rpc_submit_cleaning(text, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_refund_court: 본인 코트 예약 취소 환불 (마지막 미환불 예약 차감분만큼)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_refund_court(p_court_id int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tx public.point_transactions;
  v_refund int;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select * into v_tx
  from public.point_transactions
  where user_id = v_actor
    and kind = 'court'
    and delta < 0
    and ref_id = 'court-' || p_court_id
    and revoked_at is null
  order by created_at desc
  limit 1;

  if not found then
    return 0; -- 환불할 차감 내역 없음 (무료 예약 등)
  end if;

  v_refund := abs(v_tx.delta);
  update public.point_transactions set revoked_at = now() where id = v_tx.id;
  perform public._award_points(v_actor, v_refund, 'court', '코트 ' || p_court_id || ' 예약 취소 환불', 'refund-' || p_court_id);

  return v_refund;
end;
$$;

grant execute on function public.rpc_refund_court(int) to authenticated;
