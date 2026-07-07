import { getSupabase } from '@/src/lib/supabase';
import type { CleaningSubmission } from '@/src/types';

type DbCleaning = {
  id: string;
  user_id: string;
  user_name: string;
  kind: string;
  area: string;
  participant_count: number;
  points: number;
  submitted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

function mapCleaningRow(row: DbCleaning): CleaningSubmission {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    kind: (row.kind as CleaningSubmission['kind']) ?? 'cleaning',
    area: row.area,
    participantCount: row.participant_count,
    points: row.points,
    submittedAt: row.submitted_at,
    revokedAt: row.revoked_at ?? undefined,
    revokedBy: row.revoked_by ?? undefined,
  };
}

/** 청소·네트·콕 운반 인증 insert. 반환 uuid 로 로컬 id 치환 가능 */
export async function insertCleaningRemote(entry: CleaningSubmission): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('cleaning_submissions')
    .insert({
      user_id: entry.userId,
      user_name: entry.userName,
      kind: entry.kind ?? 'cleaning',
      area: entry.area,
      participant_count: entry.participantCount,
      points: entry.points,
      submitted_at: entry.submittedAt,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

export async function revokeCleaningRemote(id: string, adminId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('cleaning_submissions')
    .update({ revoked_at: new Date().toISOString(), revoked_by: adminId })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchCleaningSubmissions(): Promise<CleaningSubmission[]> {
  const { data, error } = await getSupabase()
    .from('cleaning_submissions')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data as DbCleaning[]).map(mapCleaningRow);
}
