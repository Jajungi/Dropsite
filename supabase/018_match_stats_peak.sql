-- 경기 전적/Elo 일괄 반영 · 피크타임 예약 카운트 일일 리셋
-- 016, 017 실행 후 적용

-- ---------------------------------------------------------------------------
-- rpc_sync_match_stats: 경기 참가자 전적/Elo를 profiles에 반영 (RLS 우회)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_sync_match_stats(
  p_match_id uuid,
  p_stats jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.match_results;
  v_actor uuid := auth.uid();
  v_elem jsonb;
  v_uid uuid;
  v_participants uuid[];
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  select * into v_match from public.match_results where id = p_match_id;
  if not found then
    raise exception 'match not found';
  end if;

  v_participants := coalesce(v_match.team_a, '{}') || coalesce(v_match.team_b, '{}');

  if not (public.is_admin() or v_actor = any(v_participants)) then
    raise exception 'forbidden';
  end if;

  for v_elem in select * from jsonb_array_elements(p_stats)
  loop
    v_uid := (v_elem->>'user_id')::uuid;
    if not (v_uid = any(v_participants)) then
      raise exception 'user not in match';
    end if;

    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles
    set
      elo = (v_elem->>'elo')::int,
      rank = (v_elem->>'rank')::public.rank_tier,
      wins = (v_elem->>'wins')::int,
      losses = (v_elem->>'losses')::int,
      total_games = (v_elem->>'total_games')::int,
      updated_at = now()
    where id = v_uid;
  end loop;
end;
$$;

grant execute on function public.rpc_sync_match_stats(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_reset_peak_reservations: 본인 피크타임 예약 횟수 0으로 (자정 리셋)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_reset_peak_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles
  set peak_time_reservations = 0, updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.rpc_reset_peak_reservations() to authenticated;
