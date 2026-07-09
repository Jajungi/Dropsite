-- ============================================================
-- 020: Advisors 경고 정리 (재실행 안전)
-- 019 실행 후 Supabase SQL Editor에서 적용
--
-- 해결:
--   · function_search_path_mutable (rank_from_elo, is_valid_student_id)
--   · anon 역할의 rpc_* / 헬퍼 함수 직접 호출 차단
--
-- 남는 경고 (앱 구조상 정상, 무시 가능):
--   · authenticated + SECURITY DEFINER RPC (앱이 RPC로 호출)
--   · auth_allow_anonymous_sign_ins (게스트 로그인)
--   · public avatars bucket listing
--   · auth_leaked_password_protection (Pro/이메일 설정)
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) search_path 고정
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_student_id(p_student_id text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_student_id ~ '^(19|20)\d{2}\d{5}$';
$$;

create or replace function public.rank_from_elo(p_elo int)
returns public.rank_tier
language sql
immutable
set search_path = public
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

-- ---------------------------------------------------------------------------
-- 2) anon: rpc_* 및 RLS 헬퍼 직접 호출 차단 (로그인 없이 API 호출 방어)
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
      and (
        p.proname like 'rpc\_%' escape '\'
        or p.proname in ('is_admin', 'is_coach', 'is_approved_member', 'is_valid_student_id')
      )
  loop
    execute format('revoke all on function %s from anon', r.sig);
    execute format('revoke all on function %s from public', r.sig);
  end loop;
end $$;

-- authenticated에는 기존 grant 유지 (앱·RLS에서 필요)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.is_approved_member() to authenticated;
