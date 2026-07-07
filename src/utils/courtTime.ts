/** 종료 직후 자동 반납까지 (courtMaintenance와 동일) */
export const JUST_FINISHED_TTL_MS = 12 * 60 * 1000;

export function formatElapsed(iso?: string): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return '방금 시작';
  if (min < 60) return `${min}분째`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export function formatCleanupRemaining(
  finishedAt?: string,
  ttlMs = JUST_FINISHED_TTL_MS
): string | null {
  if (!finishedAt) return null;
  const left = ttlMs - (Date.now() - new Date(finishedAt).getTime());
  if (left <= 0) return '곧 반납';
  const min = Math.ceil(left / 60_000);
  if (min < 60) return `정리 ${min}분`;
  return `정리 ${Math.floor(min / 60)}시간`;
}
