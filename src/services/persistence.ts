import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Court, TeamRoom } from '@/src/types';

const COURTS_KEY = '@badmin/courts';
const ROOMS_KEY = '@badmin/rooms';

export async function saveCourts(courts: Court[]): Promise<void> {
  await AsyncStorage.setItem(COURTS_KEY, JSON.stringify(courts));
}

export async function loadCourts(): Promise<Court[] | null> {
  const raw = await AsyncStorage.getItem(COURTS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Court[];
  } catch {
    return null;
  }
}

export async function saveRooms(rooms: TeamRoom[]): Promise<void> {
  await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export async function loadRooms(): Promise<TeamRoom[] | null> {
  const raw = await AsyncStorage.getItem(ROOMS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeamRoom[];
  } catch {
    return null;
  }
}

export async function clearPersistedState(): Promise<void> {
  await AsyncStorage.multiRemove([COURTS_KEY, ROOMS_KEY]);
}
