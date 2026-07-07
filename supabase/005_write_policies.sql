-- ============================================================
-- 005: 앱 쓰기 연결에 필요한 정책·RPC 보완 (재실행 안전)
-- notifications / admin_logs insert 정책 + rpc_adjust_points 권한 완화
-- Supabase SQL Editor에 전체 붙여넣고 Run 하세요.
-- ============================================================

-- ---------------------------------------------------------------------------
-- notifications: 앱 모델(type/courtId)에 맞춰 컬럼 보강 + insert 정책
-- ---------------------------------------------------------------------------
alter table public.notifications add column if not exists court_id int;

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check (public.is_approved_member() or public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_logs: 앱 모델(category/meta/문자열 target_id)에 맞춰 컬럼 보강
-- target_id 는 회원 uuid 뿐 아니라 matchId 등도 담으므로 text 로 완화
-- ---------------------------------------------------------------------------
alter table public.admin_logs add column if not exists category text not null default 'system';
alter table public.admin_logs add column if not exists meta jsonb;
alter table public.admin_logs drop constraint if exists admin_logs_target_id_fkey;
alter table public.admin_logs alter column target_id type text using target_id::text;

-- 승인 회원 행동도 감사 로그로 기록 (읽기는 관리자만 유지)
drop policy if exists "admin_logs_insert" on public.admin_logs;
create policy "admin_logs_insert"
  on public.admin_logs for insert to authenticated
  with check (public.is_approved_member() or public.is_admin());

-- ---------------------------------------------------------------------------
-- rpc_adjust_points: 본인 포인트는 본인이, 타인 포인트는 관리자만 조정
-- (기존: admin kind만 검사 → 본인 예약 취소 환불 등이 막히는 문제 수정)
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
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  -- 타인의 포인트를 건드리려면 관리자여야 함
  if p_user_id <> v_actor and not public.is_admin() then
    raise exception 'can only adjust own points unless admin';
  end if;

  -- admin kind(운영진 조정)는 관리자만
  if p_kind = 'admin' and not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  -- 컬럼 가드 트리거 우회 (이 RPC 는 신뢰된 포인트 변경 경로)
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
-- 보안: 회원이 자기 프로필의 민감 컬럼(포인트·엘로·등급 등)을 직접 조작 못하게 차단
-- 관리자 또는 서버 RPC(GUC 플래그) 를 통해서만 변경 가능
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 서버 RPC 가 명시적으로 허용한 트랜잭션은 통과
  if coalesce(current_setting('app.allow_sensitive_profile_write', true), '') = 'on' then
    return new;
  end if;
  -- 관리자는 모든 컬럼 변경 가능 (회원 승인·회비 인증·포인트 지급 등)
  if public.is_admin() then
    return new;
  end if;
  -- 그 외(본인 self-update): 민감 컬럼 변경 금지
  if new.points is distinct from old.points
     or new.elo is distinct from old.elo
     or new.rank is distinct from old.rank
     or new.wins is distinct from old.wins
     or new.losses is distinct from old.losses
     or new.total_games is distinct from old.total_games
     or new.cleaning_contributions is distinct from old.cleaning_contributions
     or new.membership_tier is distinct from old.membership_tier
     or new.member_status is distinct from old.member_status
     or new.lesson_status is distinct from old.lesson_status
     or new.club_fee_verified_at is distinct from old.club_fee_verified_at
     or new.club_fee_verified_by is distinct from old.club_fee_verified_by
     or new.suspended_at is distinct from old.suspended_at
     or new.suspended_reason is distinct from old.suspended_reason then
    raise exception 'protected profile columns require admin or server RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns_trg on public.profiles;
create trigger guard_profile_columns_trg
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------------------------------------------------------------------------
-- Realtime: notifications 도 실시간 반영 (선택)
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
