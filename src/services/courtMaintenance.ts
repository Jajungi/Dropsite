import type { Court } from '@/src/types';

/** 종료 직후 코트 자동 반납 대기 (ms) */
const JUST_FINISHED_TTL_MS = 12 * 60 * 1000;

function emptyCourt(c: Court): Court {
  return {
    ...c,
    status: 'empty',
    players: [],
    gamesCompleted: 0,
    maxGames: 0,
    joinRequests: [],
    reservedBy: undefined,
    reservedAt: undefined,
    startedAt: undefined,
    finishedAt: undefined,
    gameMode: undefined,
    nantaHalf: undefined,
  };
}

/** just_finished 코트 자동 반납 등 주기적 정리 */
export function applyCourtMaintenance(courts: Court[], now = Date.now()): Court[] {
  let changed = false;
  const next = courts.map((c) => {
    if (c.status !== 'just_finished' || !c.finishedAt) return c;
    const elapsed = now - new Date(c.finishedAt).getTime();
    if (elapsed < JUST_FINISHED_TTL_MS) return c;
    changed = true;
    return emptyCourt(c);
  });
  return changed ? next : courts;
}
