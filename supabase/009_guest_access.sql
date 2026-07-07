-- ============================================================
-- 009: 게스트(익명) 접근 — 프로필 설정 + 코트 예약(무료)
-- 전제: 001~008 적용 완료
-- Supabase Dashboard → Authentication → Providers → Anonymous sign-ins 활성화 필요
-- ============================================================

-- ---------------------------------------------------------------------------
-- rpc_setup_guest_profile — 익명 로그인 직후 이름·게스트 등급 설정
-- ---------------------------------------------------------------------------
create or replace function public.rpc_setup_guest_profile(p_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name text := trim(p_name);
  v_profile public.profiles;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if length(v_name) < 2 or length(v_name) > 12 then
    raise exception 'invalid guest name';
  end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);

  update public.profiles
  set
    name = v_name,
    nickname = v_name,
    student_id = 'guest-' || substr(replace(v_actor::text, '-', ''), 1, 10),
    membership_tier = 'guest',
    member_status = 'approved',
    points = 0,
    elo = 1000,
    rank = 'bronze',
    updated_at = now()
  where id = v_actor
  returning * into v_profile;

  if not found then
    insert into public.profiles (
      id, student_id, name, nickname, membership_tier, member_status, points, elo, rank
    )
    values (
      v_actor,
      'guest-' || substr(replace(v_actor::text, '-', ''), 1, 10),
      v_name,
      v_name,
      'guest',
      'approved',
      0,
      1000,
      'bronze'
    )
    returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

grant execute on function public.rpc_setup_guest_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_reserve_court — 게스트는 포인트 없이 일반·난타만 예약 가능
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
  v_is_guest boolean := false;
  v_profile public.profiles;
  v_court public.courts;
  v_cost int := 0;
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

  v_is_guest := v_profile.membership_tier = 'guest';

  if p_game_count is null or p_game_count < 2 or p_game_count > 6 then
    raise exception 'invalid game count';
  end if;

  if v_is_guest and p_game_mode = 'ranked' then
    raise exception 'guests cannot reserve ranked games';
  end if;

  if not v_is_admin then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  select * into v_court from public.courts where id = p_court_id for update;
  if not found then raise exception 'court not found'; end if;
  if v_court.status <> 'empty' then raise exception 'court not available'; end if;

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

  if v_court.is_coach_court and not v_is_admin and not v_is_guest then
    if v_profile.lesson_status <> 'approved' then
      raise exception 'coach court requires approved lesson access';
    end if;
    if not exists (
      select 1 from public.lesson_queue q
      where q.user_id = v_actor and q.status in ('next', 'active')
    ) then
      raise exception 'not your lesson turn';
    end if;
  elsif v_court.is_coach_court and v_is_guest then
    raise exception 'guests cannot reserve coach court';
  end if;

  v_hour := extract(hour from (now() at time zone 'Asia/Seoul'));
  v_peak := v_hour in (19, 20);

  if not v_is_guest then
    if v_peak and v_profile.peak_time_reservations >= 2 and not v_is_admin then
      raise exception 'peak reservation limit reached';
    end if;

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

    perform public._award_points(
      v_actor, -v_cost, 'court', v_court.name || ' 예약', 'court-' || p_court_id
    );

    if v_peak then
      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles
      set peak_time_reservations = peak_time_reservations + 1
      where id = v_actor;
    end if;
  end if;

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
