-- ============================================================
-- 010: 익명(게스트) 가입 500 수정
-- 원인: handle_new_user 가 email 없는 익명 유저에서 student_id = null → profiles INSERT 실패
--       → Auth API "Database error creating anonymous user" (500)
-- 실행: Supabase SQL Editor 에 붙여넣고 Run (009 적용 후)
-- Dashboard: Authentication → Providers → Anonymous sign-ins ON
-- ============================================================

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
  -- 익명(게스트) 가입: email 이 비어 있음 → 기존 로직은 student_id null → INSERT 실패
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
    v_student_id := 'user-' || substr(replace(new.id::text, '-', ''), 1, 16);
  end if;

  v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), v_student_id);
  v_email := coalesce(new.raw_user_meta_data->>'contact_email', '');

  insert into public.profiles (id, student_id, name, nickname, email)
  values (new.id, v_student_id, v_name, v_name, v_email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- rpc_setup_guest_profile: 트리거가 이미 guest 프로필을 만들었을 때 이름만 갱신
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
  v_sid text;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if length(v_name) < 2 or length(v_name) > 12 then
    raise exception 'invalid guest name';
  end if;

  v_sid := 'guest-' || substr(replace(v_actor::text, '-', ''), 1, 16);

  perform set_config('app.allow_sensitive_profile_write', 'on', true);

  update public.profiles
  set
    name = v_name,
    nickname = v_name,
    student_id = v_sid,
    membership_tier = 'guest',
    member_status = 'approved',
    updated_at = now()
  where id = v_actor
  returning * into v_profile;

  if not found then
    insert into public.profiles (
      id, student_id, name, nickname, membership_tier, member_status
    )
    values (v_actor, v_sid, v_name, v_name, 'guest', 'approved')
    returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

grant execute on function public.rpc_setup_guest_profile(text) to authenticated;
