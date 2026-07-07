import { useEffect } from 'react';
import { useCourtStore } from '@/src/stores/courtStore';

const REFRESH_INTERVAL_MS = 30_000;

/** 코트 상태 주기 갱신 — just_finished 자동 반납 등 */
export function useCourtRealtime() {
  const lastUpdated = useCourtStore((s) => s.lastUpdated);
  const refreshCourts = useCourtStore((s) => s.refreshCourts);

  useEffect(() => {
    refreshCourts();
    const timer = setInterval(refreshCourts, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshCourts]);

  return { lastUpdated };
}
