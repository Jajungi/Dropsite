-- 관리자 동기화 RPC: 포인트 취소 · 코트 환불 · 청소/네트 취소
-- Supabase SQL Editor에서 016_attendance_admin_delete.sql 실행 후 이 파일도 실행하세요.

-- ---------------------------------------------------------------------------
-- rpc_revoke_point_transaction: 관리자 포인트 거래 취소 (revoked_at + 잔액 회수)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_revoke_point_transaction(
  p_tx_id uuid,
  p_reason text default '운영진 취소'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.point_transactions;
  v_reversal int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_tx
  from public.point_transactions
  where id = p_tx_id
  for update;

  if not found then
    raise exception 'transaction not found';
  end if;
  if v_tx.revoked_at is not null then
    raise exception 'already revoked';
  end if;
  if v_tx.delta = 0 then
    raise exception 'cannot revoke zero transaction';
  end if;

  update public.point_transactions
  set revoked_at = now()
  where id = p_tx_id;

  v_reversal := -v_tx.delta;
  perform public._award_points(
    v_tx.user_id,
    v_reversal,
    'admin',
    '포인트 취소 · ' || v_tx.reason || ' (' || coalesce(nullif(trim(p_reason), ''), '운영진 취소') || ')',
    p_tx_id::text
  );

  return v_reversal;
end;
$$;

grant execute on function public.rpc_revoke_point_transaction(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_admin_refund_court: 관리자 코트 환불·반납 (지정 회원의 미환불 예약 차감분)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_refund_court(
  p_court_id int,
  p_user_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.point_transactions;
  v_refund int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_tx
  from public.point_transactions
  where user_id = p_user_id
    and kind = 'court'
    and delta < 0
    and ref_id = 'court-' || p_court_id
    and revoked_at is null
  order by created_at desc
  limit 1;

  if not found then
    return 0;
  end if;

  v_refund := abs(v_tx.delta);
  update public.point_transactions set revoked_at = now() where id = v_tx.id;
  perform public._award_points(
    p_user_id,
    v_refund,
    'court',
    '코트 ' || p_court_id || ' 예약 환불 (운영진)',
    'refund-admin-' || p_court_id
  );

  return v_refund;
end;
$$;

grant execute on function public.rpc_admin_refund_court(int, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_revoke_cleaning_submission: 관리자 청소/네트 인증 취소 (포인트·기여 카운트 포함)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_revoke_cleaning_submission(
  p_submission_id uuid,
  p_reason text default '운영진 취소'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.cleaning_submissions;
  v_tx public.point_transactions;
  v_reversal int;
  v_reason text := coalesce(nullif(trim(p_reason), ''), '운영진 취소');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_row
  from public.cleaning_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'submission not found';
  end if;
  if v_row.revoked_at is not null then
    raise exception 'already revoked';
  end if;

  update public.cleaning_submissions
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_submission_id;

  select * into v_tx
  from public.point_transactions
  where user_id = v_row.user_id
    and ref_id = p_submission_id::text
    and revoked_at is null
    and delta > 0
  order by created_at desc
  limit 1;

  if found then
    update public.point_transactions set revoked_at = now() where id = v_tx.id;
    v_reversal := v_tx.delta;
    perform public._award_points(
      v_row.user_id,
      -v_reversal,
      'admin',
      case v_row.kind
        when 'net_setup' then '네트 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
        else '청소 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
      end,
      p_submission_id::text
    );
  else
    v_reversal := v_row.points;
    if v_reversal > 0 then
      perform public._award_points(
        v_row.user_id,
        -v_reversal,
        'admin',
        case v_row.kind
          when 'net_setup' then '네트 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
          else '청소 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
        end,
        p_submission_id::text
      );
    end if;
  end if;

  if v_row.kind = 'cleaning' then
    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles
    set cleaning_contributions = greatest(0, cleaning_contributions - 1)
    where id = v_row.user_id;
  end if;

  return coalesce(v_reversal, 0);
end;
$$;

grant execute on function public.rpc_revoke_cleaning_submission(uuid, text) to authenticated;

-- 청소 제출 revoke 업데이트 (RPC 외 직접 update 폴백용)
drop policy if exists "cleaning_update_admin" on public.cleaning_submissions;
create policy "cleaning_update_admin"
  on public.cleaning_submissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
