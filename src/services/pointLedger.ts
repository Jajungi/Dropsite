import type { PointTransaction, PointTransactionType } from '@/src/types';
import { usePointStore } from '@/src/stores/pointStore';
import { useAuthStore } from '@/src/stores/authStore';
import { isSupabaseEnabled } from '@/src/lib/supabase';

export function applyPointChange(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: PointTransaction['meta']
) {
  // 낙관적 로컬 반영 (즉각 UI). Supabase 모드에서는 서버 값이 realtime 으로 재조정됨.
  usePointStore.getState().recordTransaction({ userId, amount, type, description, meta });
  useAuthStore.getState().updateUserPoints(userId, amount);

  if (isSupabaseEnabled()) {
    // 서버 RPC(rpc_adjust_points): 프로필 포인트 + 거래내역을 원자적으로 기록
    import('@/src/services/supabase/points')
      .then(({ adjustPointsRemote }) =>
        adjustPointsRemote(userId, amount, type, description, meta)
      )
      .catch((err) => console.warn('[points] adjust failed', err));
  }
}

/**
 * 서버 전용 RPC(rpc_check_in·rpc_submit_cleaning·rpc_refund_court)가
 * 포인트 적립을 이미 처리하는 경우 — 로컬 낙관적 반영만 하고 rpc_adjust_points 는 호출하지 않음.
 */
export function applyPointChangeLocalOnly(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: PointTransaction['meta']
) {
  usePointStore.getState().recordTransaction({ userId, amount, type, description, meta });
  useAuthStore.getState().updateUserPoints(userId, amount);
}
