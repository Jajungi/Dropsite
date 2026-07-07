import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_SESSION_KEY = '@badmin/guest-session';

export interface GuestSessionMarker {
  userId: string;
  name: string;
}

export async function saveGuestSession(marker: GuestSessionMarker): Promise<void> {
  await AsyncStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(marker));
}

export async function loadGuestSession(): Promise<GuestSessionMarker | null> {
  const raw = await AsyncStorage.getItem(GUEST_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestSessionMarker;
  } catch {
    return null;
  }
}

export async function clearGuestSession(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_SESSION_KEY);
}
