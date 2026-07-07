-- ============================================================
-- 013: 학번 형식 검증 · 가입 즉시 승인 · 계정 삭제
-- 학번: 연도 4자리 + 숫자 5자리 (예: 202410001)
-- 실행: Supabase SQL Editor 에 붙여넣고 Run
-- ============================================================

create or replace function public.is_valid_student_id(p_student_id text)
returns boolean
language sql
immutable
as $$
  select p_student_id ~ '^(19|20)\d{2}\d{5}$';
$$;

-- 신규 Auth 가입 시 profiles 자동 생성 (게스트 + 정식 회원)
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
  -- 익명(게스트) 가입
  if nullif(btrim(coalesce(new.email, '')), '') is null then
    v_student_id := 'guest-' || substr(replace(new.id::text, '-', ''), 1, 16);
    v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), '게스트');
    v_email := '';
    insert into public.profiles (
      id, student_id, name, nickname, email, membership_tier, member_status
    )
    values (
      new.id, v_student_id, v_name, v_name, v_email, 'guest', 'approved'
    )
    on conflict (id) do nothing;
    return new;
  end if;

  v_student_id := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'student_id'), ''),
    nullif(split_part(new.email, '@', 1), '')
  );
  if v_student_id is null or v_student_id = '' then
    raise exception 'student id required';
  end if;

  if not public.is_valid_student_id(v_student_id) then
    raise exception 'invalid student id format';
  end if;

  v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), v_student_id);
  v_email := coalesce(new.raw_user_meta_data->>'contact_email', '');

  insert into public.profiles (
    id, student_id, name, nickname, email, membership_tier, member_status
  )
  values (
    new.id, v_student_id, v_name, v_name, v_email, 'associate', 'approved'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 삭제 대상 회원 FK 정리 (rpc_delete_account · 관리자 리셋 공용)
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

-- 본인 또는 관리자가 계정 삭제 (auth.users 삭제 → profiles cascade)
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
