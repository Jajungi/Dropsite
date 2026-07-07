import { useAuthStore } from '@/src/stores/authStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { persistAppState } from '@/src/services/appState';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import type { AdminLogCategory } from '@/src/types';

export interface RecordAdminLogInput {
  category: AdminLogCategory;
  action: string;
  message: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  meta?: Record<string, string | number>;
}

export function recordAdminLog(input: RecordAdminLogInput) {
  useAdminLogStore.getState().append(input);
  persistAppState();

  if (isSupabaseEnabled()) {
    const latest = useAdminLogStore.getState().logs[0];
    if (latest) {
      import('@/src/services/supabase/adminLogs')
        .then(({ insertAdminLogRemote }) => insertAdminLogRemote(latest))
        .catch((err) => console.warn('[adminLog] insert failed', err));
    }
  }
}

export function recordAdminLogAsCurrentUser(
  input: Omit<RecordAdminLogInput, 'actorId' | 'actorName'>
) {
  const actor = useAuthStore.getState().currentUser;
  recordAdminLog({
    ...input,
    actorId: actor?.id,
    actorName: actor?.name ?? '시스템',
  });
}

export function recordAdminLogAsActor(
  actorId: string,
  input: Omit<RecordAdminLogInput, 'actorId' | 'actorName'>
) {
  const actor = useAuthStore.getState().users.find((u) => u.id === actorId);
  recordAdminLog({
    ...input,
    actorId,
    actorName: actor?.name ?? '관리자',
  });
}
