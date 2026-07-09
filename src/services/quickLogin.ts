import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_LOGIN_KEY = '@badmin/saved-login';
const LEGACY_QUICK_LOGIN_KEY = '@badmin/quick-login';

export interface SavedLoginAccount {
  studentId: string;
  name: string;
}

function isValidAccount(value: unknown): value is SavedLoginAccount {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.studentId === 'string' && typeof v.name === 'string';
}

async function migrateLegacyEntries(): Promise<SavedLoginAccount | null> {
  const raw = await AsyncStorage.getItem(LEGACY_QUICK_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (typeof first.studentId === 'string' && typeof first.name === 'string') {
        await AsyncStorage.removeItem(LEGACY_QUICK_LOGIN_KEY);
        return { studentId: first.studentId, name: first.name };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 이 기기에 저장된 마지막 로그인 계정 (비밀번호는 저장하지 않음) */
export async function loadSavedLogin(): Promise<SavedLoginAccount | null> {
  const raw = await AsyncStorage.getItem(SAVED_LOGIN_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidAccount(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }
  return migrateLegacyEntries();
}

export async function saveSavedLogin(account: SavedLoginAccount): Promise<void> {
  await AsyncStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(account));
}

export async function clearSavedLogin(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_LOGIN_KEY);
}
