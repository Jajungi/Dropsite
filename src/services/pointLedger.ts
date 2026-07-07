import type { PointTransaction, PointTransactionType } from '@/src/types';
import { usePointStore } from '@/src/stores/pointStore';
import { useAuthStore } from '@/src/stores/authStore';

export function applyPointChange(
  userId: string,
  amount: number,
  type: PointTransactionType,
  description: string,
  meta?: PointTransaction['meta']
) {
  usePointStore.getState().recordTransaction({ userId, amount, type, description, meta });
  useAuthStore.getState().updateUserPoints(userId, amount);
}
