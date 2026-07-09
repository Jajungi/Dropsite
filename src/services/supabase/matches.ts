import { getSupabase } from '@/src/lib/supabase';
import { mapMatchRow } from './mappers';
import type { MatchResult } from '@/src/types';
import { DATA_RETENTION } from '@/src/constants/dataRetention';

function matchToDb(match: MatchResult) {
  return {
    court_id: match.courtId || null,
    team_a: match.teamA,
    team_b: match.teamB,
    score_a: match.scoreA,
    score_b: match.scoreB,
    winner: match.winner,
    status: match.status,
    played_at: match.playedAt,
    confirmed_at: match.confirmedAt ?? null,
    confirmed_by: match.confirmedBy ?? null,
    game_mode: match.gameMode ?? null,
    elo_changes: match.eloChanges ?? null,
  };
}

/** 경기 결과 insert — 반환된 서버 uuid 로 로컬 id 를 치환할 수 있게 준다 */
export async function insertMatchRemote(match: MatchResult): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('match_results')
    .insert(matchToDb(match))
    .select('id')
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

/** 확정·취소·철회 등 상태 변경 (id 는 서버 uuid) */
export async function updateMatchRemote(
  id: string,
  patch: Partial<MatchResult>
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.confirmedBy !== undefined) dbPatch.confirmed_by = patch.confirmedBy ?? null;
  if (patch.confirmedAt !== undefined) dbPatch.confirmed_at = patch.confirmedAt ?? null;
  if (patch.cancelledAt !== undefined) dbPatch.cancelled_at = patch.cancelledAt ?? null;
  if (patch.cancelledBy !== undefined) dbPatch.cancelled_by = patch.cancelledBy ?? null;
  if (patch.cancelReason !== undefined) dbPatch.cancel_reason = patch.cancelReason ?? null;
  if (patch.eloChanges !== undefined) dbPatch.elo_changes = patch.eloChanges ?? null;
  if (Object.keys(dbPatch).length === 0) return;

  const { error } = await getSupabase().from('match_results').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function fetchMatchResults(): Promise<MatchResult[]> {
  const { data, error } = await getSupabase()
    .from('match_results')
    .select('*')
    .order('played_at', { ascending: false })
    .limit(DATA_RETENTION.matchResultsDb);
  if (error) throw error;
  return (data ?? []).map(mapMatchRow);
}

export async function syncMatchStatsRemote(matchId: string): Promise<void> {
  const { error } = await getSupabase().rpc('rpc_sync_match_stats', {
    p_match_id: matchId,
  });
  if (error) throw error;
}
