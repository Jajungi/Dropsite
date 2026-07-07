import AsyncStorage from '@react-native-async-storage/async-storage';

const QUICK_LOGIN_KEY = '@badmin/quick-login';

export interface QuickLoginEntry {
  studentId: string;
  name: string;
  password: string;
}

const MAX_ENTRIES = 4;

export async function loadQuickLoginEntries(): Promise<QuickLoginEntry[]> {
  const raw = await AsyncStorage.getItem(QUICK_LOGIN_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QuickLoginEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export async function saveQuickLoginEntry(entry: QuickLoginEntry): Promise<void> {
  const existing = await loadQuickLoginEntries();
  const filtered = existing.filter((e) => e.studentId !== entry.studentId);
  const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(QUICK_LOGIN_KEY, JSON.stringify(next));
}

export async function removeQuickLoginEntry(studentId: string): Promise<void> {
  const existing = await loadQuickLoginEntries();
  const next = existing.filter((e) => e.studentId !== studentId);
  await AsyncStorage.setItem(QUICK_LOGIN_KEY, JSON.stringify(next));
}

/** 데모·테스트용 원탭 계정 */
export const DEMO_QUICK_ACCOUNTS: Pick<QuickLoginEntry, 'studentId' | 'name'>[] = [
  { studentId: '20240001', name: '김민준' },
  { studentId: '20240002', name: '이서연' },
  { studentId: '20230001', name: '관리자' },
];
