import { create } from 'zustand';
import type { Court, CourtPlayer, GameMode, NantaHalf } from '@/src/types';
import { GAME_COUNT_OPTIONS, COACH_COURT_ID } from '@/src/constants/court';
import { MIN_PLAYERS_FOR_GAME } from '@/src/constants';
import { createMockCourts } from '@/src/services/mockData';
import { userToCourtPlayer } from '@/src/services/courtService';
import { getReservationCost, isPeakTime, canReserve, isCenterCourtId } from '@/src/services/points';
import { useAuthStore } from './authStore';
import { useAppStore } from './authStore';
import { useNotificationStore } from './notificationStore';
import { useLessonStore } from './lessonStore';
import { saveCourts } from '@/src/services/persistence';
import { applyPointChange } from '@/src/services/pointLedger';
import { usePointStore } from './pointStore';
import { applyCourtMaintenance } from '@/src/services/courtMaintenance';

interface CourtState {
  courts: Court[];
  selectedCourtId: number | null;
  lastUpdated: string;
  selectCourt: (id: number | null) => void;
  reserveCourt: (
    courtId: number,
    userId: string,
    gameCount: number,
    gameMode?: GameMode,
    nantaHalf?: NantaHalf
  ) => { success: boolean; message: string };
  reserveCourtForTeam: (
    courtId: number,
    hostUserId: string,
    memberUserIds: string[],
    gameCount: number
  ) => { success: boolean; message: string };
  startGame: (courtId: number) => { success: boolean; message: string };
  completeGame: (courtId: number) => { success: boolean; message: string; sessionEnded: boolean };
  returnCourt: (courtId: number) => void;
  adminRemovePlayer: (courtId: number, userId: string) => { success: boolean; message: string };
  adminRefundAndReturn: (courtId: number) => { success: boolean; message: string };
  requestJoin: (courtId: number, userId: string, userName: string, rank: CourtPlayer['rank']) => { success: boolean; message: string };
  acceptJoin: (courtId: number, requestId: string) => { success: boolean; message: string };
  rejectJoin: (courtId: number, requestId: string) => void;
  adminClearJoinRequests: (courtId: number) => { success: boolean; message: string };
  refreshCourts: () => void;
  hydrateCourts: (courts: Court[]) => void;
}

function persistCourts(courts: Court[]) {
  saveCourts(courts).catch(() => {});
}

export const useCourtStore = create<CourtState>((set, get) => ({
  courts: createMockCourts(),
  selectedCourtId: null,
  lastUpdated: new Date().toISOString(),

  selectCourt: (id) => set({ selectedCourtId: id }),

  hydrateCourts: (courts) => set({ courts, lastUpdated: new Date().toISOString() }),

  reserveCourt: (courtId, userId, gameCount, gameMode = 'casual', nantaHalf = 'near') => {
    const appStore = useAppStore.getState();
    if (!appStore.checkGeoFence()) {
      return { success: false, message: '체육관 근처에서만 예약할 수 있어요.' };
    }

    if (!GAME_COUNT_OPTIONS.includes(gameCount as (typeof GAME_COUNT_OPTIONS)[number])) {
      return { success: false, message: '게임 수를 선택해주세요.' };
    }

    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };

    const memberCheck = authStore.canPerformMemberAction(userId);
    if (!memberCheck.allowed) {
      return { success: false, message: memberCheck.reason ?? '예약할 수 없어요.' };
    }

    const peak = isPeakTime();
    const reserveCheck = canReserve(user.points, user.peakTimeReservations, peak);
    if (!reserveCheck.allowed) {
      return { success: false, message: reserveCheck.reason ?? '예약할 수 없어요.' };
    }

    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'empty') {
      return { success: false, message: '이 코트는 예약할 수 없어요.' };
    }

    if (court.isCoachCourt || courtId === COACH_COURT_ID) {
      const lessonCheck = useLessonStore.getState().canReserveCoachCourt(userId);
      if (!lessonCheck.allowed) {
        return { success: false, message: lessonCheck.reason ?? '코치 코트를 예약할 수 없어요.' };
      }
    }

    const cost = getReservationCost(user.rank, peak, isCenterCourtId(courtId));
    if (user.points < cost) {
      return { success: false, message: `포인트가 부족해요. (필요: ${cost}P)` };
    }

    const modeLabel =
      gameMode === 'nanta' ? '난타' : gameMode === 'ranked' ? '랭크' : '일반';
    const peakNote = peak ? ' (피크)' : '';

    applyPointChange(
      userId,
      -cost,
      'court_reserve',
      `${court.name} 예약 · ${modeLabel} ${gameCount}게임${peakNote}`,
      { courtId }
    );
    if (peak) authStore.incrementPeakReservations(userId);

    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            status: 'reserved' as const,
            reservedBy: userId,
            reservedAt: new Date().toISOString(),
            maxGames: gameCount,
            gamesCompleted: 0,
            players: [userToCourtPlayer(user)],
            joinRequests: [],
            gameMode,
            nantaHalf: gameMode === 'nanta' ? nantaHalf : undefined,
          }
        : c
    );

    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    return {
      success: true,
      message: `${court.name} · ${modeLabel} · ${gameCount}게임 예약됨 (-${cost}P)`,
    };
  },

  reserveCourtForTeam: (courtId, hostUserId, memberUserIds, gameCount) => {
    const uniqueIds = [...new Set([hostUserId, ...memberUserIds])];
    const authStore = useAuthStore.getState();
    const host = authStore.users.find((u) => u.id === hostUserId);
    if (!host) return { success: false, message: '방장 정보를 찾을 수 없어요.' };

    const players = uniqueIds
      .map((id) => authStore.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => userToCourtPlayer(u!));

    if (players.length < MIN_PLAYERS_FOR_GAME) {
      return { success: false, message: `최소 ${MIN_PLAYERS_FOR_GAME}명이 필요해요.` };
    }

    const result = get().reserveCourt(courtId, hostUserId, gameCount);
    if (!result.success) return result;

    const nextCourts = get().courts.map((c) =>
      c.id === courtId ? { ...c, players } : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    return { success: true, message: `${courtId}번 코트 · 팀 ${players.length}명 예약 완료` };
  },

  startGame: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'reserved') {
      return { success: false, message: '게임을 시작할 수 없어요.' };
    }
    if (court.players.length < MIN_PLAYERS_FOR_GAME) {
      return { success: false, message: `최소 ${MIN_PLAYERS_FOR_GAME}명이 필요해요.` };
    }

    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, status: 'playing' as const, startedAt: new Date().toISOString() }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '게임이 시작되었어요.' };
  },

  completeGame: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'playing') {
      return { success: false, message: '진행 중인 게임이 없어요.', sessionEnded: false };
    }

    const newGames = court.gamesCompleted + 1;
    const sessionEnded = newGames >= court.maxGames;

    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      if (sessionEnded) {
        return {
          ...c,
          gamesCompleted: newGames,
          status: 'just_finished' as const,
          finishedAt: new Date().toISOString(),
        };
      }
      return { ...c, gamesCompleted: newGames };
    });

    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    return {
      success: true,
      message: sessionEnded ? '모든 게임 완료! 결과를 입력해주세요.' : `게임 ${newGames}/${court.maxGames} 완료`,
      sessionEnded,
    };
  },

  returnCourt: (courtId) => {
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            status: 'empty' as const,
            players: [],
            gamesCompleted: 0,
            maxGames: 0,
            joinRequests: [],
            reservedBy: undefined,
            reservedAt: undefined,
            startedAt: undefined,
            finishedAt: undefined,
            gameMode: undefined,
            nantaHalf: undefined,
          }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
  },

  adminRemovePlayer: (courtId, userId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    const player = court.players.find((p) => p.userId === userId);
    if (!player) return { success: false, message: '해당 참가자가 없어요.' };

    const nextPlayers = court.players.filter((p) => p.userId !== userId);
    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      return {
        ...c,
        players: nextPlayers,
        reservedBy:
          c.reservedBy === userId
            ? nextPlayers[0]?.userId ?? undefined
            : c.reservedBy,
        status:
          nextPlayers.length === 0 && c.status === 'playing'
            ? ('reserved' as const)
            : c.status,
      };
    });
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: `${player.name}님을 코트에서 냈어요.` };
  },

  adminRefundAndReturn: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status === 'empty') {
      return { success: false, message: '반납할 코트가 없어요.' };
    }

    const payerId = court.reservedBy ?? court.players[0]?.userId;
    let refunded = 0;
    if (payerId) {
      const tx = usePointStore
        .getState()
        .transactions.find(
          (t) =>
            t.userId === payerId &&
            t.type === 'court_reserve' &&
            t.meta?.courtId === courtId &&
            t.amount < 0
        );
      if (tx) {
        refunded = -tx.amount;
        applyPointChange(payerId, refunded, 'admin', `코트 ${courtId} 예약 환불 (운영진)`, {
          courtId,
        });
      }
    }

    get().returnCourt(courtId);
    return {
      success: true,
      message:
        refunded > 0
          ? `코트를 반납하고 ${refunded}P를 환불했어요.`
          : '코트를 반납했어요.',
    };
  },

  requestJoin: (courtId, userId, userName, rank) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'playing') {
      return { success: false, message: '합류할 수 있는 코트가 아니에요.' };
    }
    if (court.players.length >= 4) {
      return { success: false, message: '코트가 가득 찼어요.' };
    }
    if (court.players.some((p) => p.userId === userId)) {
      return { success: false, message: '이미 참가 중이에요.' };
    }
    if (court.joinRequests.some((r) => r.userId === userId)) {
      return { success: false, message: '이미 합류 신청했어요.' };
    }

    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            joinRequests: [
              ...c.joinRequests,
              {
                id: `jr-${Date.now()}`,
                userId,
                userName,
                rank,
                requestedAt: new Date().toISOString(),
              },
            ],
          }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    const hostId = court.reservedBy ?? court.players[0]?.userId;
    if (hostId && hostId !== userId) {
      useNotificationStore.getState().pushInbox({
        type: 'join',
        title: '참가 요청',
        message: `${userName}님이 ${courtId}번 코트 합류를 요청했어요`,
        courtId,
        targetUserId: hostId,
      });
    }

    return { success: true, message: '합류 신청이 접수되었어요.' };
  },

  acceptJoin: (courtId, requestId) => {
    const authStore = useAuthStore.getState();
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (court.players.length >= 4) {
      return { success: false, message: '코트가 가득 찼어요.' };
    }

    const request = court.joinRequests.find((r) => r.id === requestId);
    if (!request) return { success: false, message: '신청을 찾을 수 없어요.' };

    const user = authStore.users.find((u) => u.id === request.userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };

    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      return {
        ...c,
        players: [...c.players, userToCourtPlayer(user)],
        joinRequests: c.joinRequests.filter((r) => r.id !== requestId),
      };
    });

    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: `${request.userName}님이 합류했어요.` };
  },

  rejectJoin: (courtId, requestId) => {
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, joinRequests: c.joinRequests.filter((r) => r.id !== requestId) }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
  },

  adminClearJoinRequests: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (court.joinRequests.length === 0) {
      return { success: false, message: '삭제할 합류 신청이 없어요.' };
    }
    const nextCourts = get().courts.map((c) =>
      c.id === courtId ? { ...c, joinRequests: [] } : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '합류 신청을 모두 삭제했어요.' };
  },

  refreshCourts: () => {
    const maintained = applyCourtMaintenance(get().courts);
    if (maintained !== get().courts) {
      set({ courts: maintained, lastUpdated: new Date().toISOString() });
      persistCourts(maintained);
    } else {
      set({ lastUpdated: new Date().toISOString() });
    }
  },
}));
