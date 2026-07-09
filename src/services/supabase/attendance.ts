import { getSupabase } from '@/src/lib/supabase';
import { mapAttendanceRow } from './mappers';
import type { AttendanceRecord } from '@/src/types';

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

/** 관리자: 전체 회원 출석 기록 (RLS is_admin) */
export async function fetchAllAttendance(limit = 120): Promise<AttendanceRecord[]> {
  const { data, error } = await getSupabase()
    .from('attendance_records')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapAttendanceRow);
}

function isLocalAttendanceId(recordId: string): boolean {
  return recordId.startsWith('att-');
}

/** 관리자 출석 취소 — DB에서 삭제 (로컬 임시 id면 userId+date로 삭제) */
export async function revokeAttendanceRemote(params: {
  recordId: string;
  userId: string;
  date: string;
}): Promise<void> {
  const client = getSupabase();
  if (isLocalAttendanceId(params.recordId)) {
    const { error } = await client
      .from('attendance_records')
      .delete()
      .eq('user_id', params.userId)
      .eq('date', params.date);
    if (error) throw error;
    return;
  }

  const { error } = await client.from('attendance_records').delete().eq('id', params.recordId);
  if (error) throw error;
}

/** 관리자 대리 출석 — rpc_admin_check_in (지오펜스 없음) */
export async function adminCheckInRemote(userId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('rpc_admin_check_in', {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export function subscribeAllAttendance(onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel('attendance-all-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () =>
      onChange()
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeAttendance(userId: string, onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel('attendance-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_records', filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
