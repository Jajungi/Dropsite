import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_LOGIN_KEY = '@badmin/saved-login';
const LEGACY_QUICK_LOGIN_KEY = '@badmin/quick-login';

export interface SavedLoginAccount {
  studentId: string;
  name: string;
  password: string;
}

function isValidAccount(value: unknown): value is SavedLoginAccount {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.studentId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.password === 'string'
  );
}

async function migrateLegacyEntries(): Promise<SavedLoginAccount | null> {
  const raw = await AsyncStorage.getItem(LEGACY_QUICK_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0 && isValidAccount(parsed[0])) {
      await AsyncStorage.removeItem(LEGACY_QUICK_LOGIN_KEY);
      return parsed[0];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 이 기기에 저장된 마지막 로그인 계정 (1개) */
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
