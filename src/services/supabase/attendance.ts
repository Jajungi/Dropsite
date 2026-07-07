import { getSupabase } from '@/src/lib/supabase';
import { mapAttendanceRow } from './mappers';
import type { AttendanceRecord } from '@/src/types';

/** 오늘 출석 기록 insert (unique(user_id, date) 로 중복 방지) */
export async function insertAttendanceRemote(userId: string, date: string): Promise<void> {
  const { error } = await getSupabase()
    .from('attendance_records')
    .insert({ user_id: userId, date });
  if (error) throw error;
}

export async function fetchAttendance(userId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await getSupabase()
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map(mapAttendanceRow);
}
