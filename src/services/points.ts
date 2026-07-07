import {
  FULL_MEMBER_POINT_MULTIPLIER,
  MIN_RESERVE_POINTS,
  PEAK_HOURS,
  PEAK_TIME_RESERVATION_LIMIT,
  RANK_ORDER,
  RANK_THRESHOLDS,
  CENTER_COURTS,
} from '@/src/constants';
import type { MembershipTier, RankTier } from '@/src/types';

export function getRankFromElo(elo: number): RankTier {
  const ranks = [...RANK_ORDER].reverse();
  for (const rank of ranks) {
    if (elo >= RANK_THRESHOLDS[rank].min) return rank;
  }
  return 'bronze';
}

export function getReservationCost(
  rank: RankTier,
  isPeakTime: boolean,
  isCenterCourt = false
): number {
  let baseCost = isPeakTime ? 25 : 20;
  if (isCenterCourt) baseCost = Math.round(baseCost * 1.5);
  const rankIndex = RANK_ORDER.indexOf(rank);
  const discount = rankIndex * 2;
  return Math.max(5, baseCost - discount);
}

export function isCenterCourtId(courtId: number): boolean {
  return CENTER_COURTS.includes(courtId);
}

export function applyPointMultiplier(
  points: number,
  membershipTier: MembershipTier
): number {
  if (membershipTier === 'full') {
    return Math.round(points * FULL_MEMBER_POINT_MULTIPLIER);
  }
  return points;
}

export function canReserve(
  userPoints: number,
  peakTimeReservations: number,
  isPeakTime: boolean
): { allowed: boolean; reason?: string } {
  if (userPoints < MIN_RESERVE_POINTS) {
    return {
      allowed: false,
      reason: `최소 ${MIN_RESERVE_POINTS}포인트가 필요해요. (현재: ${userPoints}P)`,
    };
  }

  if (isPeakTime && peakTimeReservations >= PEAK_TIME_RESERVATION_LIMIT) {
    return {
      allowed: false,
      reason: `피크타임(19~20시) 예약은 하루 ${PEAK_TIME_RESERVATION_LIMIT}회까지예요.`,
    };
  }

  return { allowed: true };
}

export function isPeakTime(now: Date = new Date()): boolean {
  return PEAK_HOURS.includes(now.getHours());
}

export function calculateWinPoints(
  membershipTier: MembershipTier,
  opponentAvgElo: number,
  userElo: number,
  ranked = true
): number {
  if (!ranked) return 0;
  const base = 50;
  const upsetBonus =
    opponentAvgElo > userElo ? Math.min(10, Math.floor((opponentAvgElo - userElo) / 50)) : 0;
  return applyPointMultiplier(base + upsetBonus, membershipTier);
}

export function calculateCleaningPoints(membershipTier: MembershipTier): number {
  return applyPointMultiplier(15, membershipTier);
}

export function getWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}
