import type { Court, TeamRoom } from '@/src/types';
import type { AppStateSnapshot } from '@/src/services/appPersistence';

export interface ServerSyncPayload {
  appState: AppStateSnapshot | null;
  courts: Court[] | null;
  rooms: TeamRoom[] | null;
  updatedAt: number;
}
