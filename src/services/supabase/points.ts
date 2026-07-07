import { getSupabase } from '@/src/lib/supabase';
import type { PointTransaction, PointTransactionType } from '@/src/types';
import { DATA_RETENTION } from '@/src/constants/dataRetention';

type DbPointKind =
  | 'earn'
  | 'spend'
  | 'admin'
  | 'revoke'
  | 'club_fee'
  | 'attendance'
  | 'cleaning'
  | 'net_setup'
  | 'court'
  | 'shuttlecock'
  | 'ranked_win'
  | 'bonus';

const APP_TO_DB_KIND: Record<PointTransactionType, DbPointKind> = {
  check_in: 'attendance',
  court_reserve: 'court',
  match_win: 'ranked_win',
  cleaning: 'cleaning',
  net_setup: 'net_setup',
  club_fee: 'club_fee',
  shuttlecock: 'shuttlecock',
  welcome: 'bonus',
  bonus: 'bonus',
  admin: 'admin',
};

const DB_TO_APP_TYPE: Record<DbPointKind, PointTransactionType> = {
  attendance: 'check_in',
  court: 'court_reserve',
  ranked_win: 'match_win',
  cleaning: 'cleaning',
  net_setup: 'net_setup',
  club_fee: 'club_fee',
  shuttlecock: 'shuttlecock',
  bonus: 'bonus',
  admin: 'admin',
  earn: 'bonus',
  spend: 'admin',
  revoke: 'admin',
};

type DbPointTx = {
  id: string;
  user_id: string;
  delta: number;
  balance_after: number;
  kind: DbPointKind;
  reason: string;
  ref_id: string | null;
  revoked_at: string | null;
  created_at: string;
};

function mapPointTxRow(row: DbPointTx): PointTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.delta,
    type: DB_TO_APP_TYPE[row.kind] ?? 'bonus',
    description: row.reason,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

/** rpc_adjust_points 호출 — 프로필 포인트 + 거래내역을 서버에서 원자적으로 처리 */
export async function adjustPointsRemote(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: { courtId?: number; matchId?: string; reversalOfId?: string }
): Promise<void> {
  const refId = meta?.matchId ?? meta?.reversalOfId ?? (meta?.courtId != null ? `court-${meta.courtId}` : null);
  const { error } = await getSupabase().rpc('rpc_adjust_points', {
    p_user_id: userId,
    p_delta: amount,
    p_kind: APP_TO_DB_KIND[type] ?? 'bonus',
    p_reason: description,
    p_ref_id: refId,
  });
  if (error) throw error;
}

/** 출석 인증 (서버가 지오펜스·중복·포인트 검증). 반환: 적립 포인트 */
export async function checkInRemote(lat: number | null, lng: number | null): Promise<number> {
  const { data, error } = await getSupabase().rpc('rpc_check_in', {
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** 청소/네트/콕 인증 (서버가 포인트 금액 강제). 반환: 서버 submission id */
export async function submitCleaningRemote(
  kind: 'cleaning' | 'net_setup',
  area: string,
  participants: number
): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('rpc_submit_cleaning', {
    p_kind: kind,
    p_area: area,
    p_participants: participants,
  });
  if (error) throw error;
  return (data as { id?: string } | null)?.id ?? null;
}

/** 코트 예약 취소 환불 (서버가 마지막 미환불 차감분만큼). 반환: 환불 포인트 */
export async function refundCourtRemote(courtId: number): Promise<number> {
  const { data, error } = await getSupabase().rpc('rpc_refund_court', {
    p_court_id: courtId,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function fetchPointTransactions(userId: string): Promise<PointTransaction[]> {
  const { data, error } = await getSupabase()
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(DATA_RETENTION.pointTransactionsPerUserDb);
  if (error) throw error;
  return (data as DbPointTx[]).map(mapPointTxRow);
}
