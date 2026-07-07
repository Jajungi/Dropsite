import { Platform } from 'react-native';
import { hydrateAppStateFromDisk } from '@/src/services/hydrateApp';

const CHANNEL_NAME = 'badmin-state-sync';
const STORAGE_KEY_PREFIX = '@badmin/';

let initialized = false;
let suppressNotifyUntil = 0;
let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRehydrate() {
  if (rehydrateTimer) clearTimeout(rehydrateTimer);
  rehydrateTimer = setTimeout(() => {
    rehydrateTimer = null;
    suppressNotifyUntil = Date.now() + 600;
    void hydrateAppStateFromDisk({ skipCleaningBonus: true });
  }, 80);
}

/** 다른 탭·창에 저장 완료를 알림 (웹 전용) */
export function notifyCrossTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (Date.now() < suppressNotifyUntil) return;

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: 'state-updated', ts: Date.now() });
    bc.close();
  } catch {
    /* BroadcastChannel 미지원 환경 */
  }
}

/** 웹: 다른 탭에서 바뀐 프로필·코트·포인트 등을 즉시 반영 */
export function initCrossTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || initialized) return;
  initialized = true;

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = () => scheduleRehydrate();
  } catch {
    /* ignore */
  }

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(STORAGE_KEY_PREFIX)) {
      scheduleRehydrate();
    }
  });
}
