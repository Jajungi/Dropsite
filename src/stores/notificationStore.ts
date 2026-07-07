import { create } from 'zustand';
import type { ToastMessage, SirenAlert, MatchResult, CleaningSubmission, AppNotification, GameMode } from '@/src/types';
import {
  MOCK_MATCH_RESULTS,
  MOCK_CLEANING_LEADERBOARD,
} from '@/src/services/mockData';
import { calculateEloChange } from '@/src/services/elo';
import { calculateWinPoints } from '@/src/services/points';
import { useAuthStore } from './authStore';
import { usePointStore } from './pointStore';
import { applyPointChange } from '@/src/services/pointLedger';
import { persistAppState } from '@/src/services/appState';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { pushLocalNotification } from '@/src/services/localNotifications';

interface NotificationState {
  toasts: ToastMessage[];
  siren: SirenAlert;
  pendingMatches: MatchResult[];
  matchHistory: MatchResult[];
  cleaningLeaderboard: CleaningSubmission[];
  inbox: AppNotification[];
  hydrate: (data: {
    pendingMatches: MatchResult[];
    matchHistory: MatchResult[];
    cleaningLeaderboard: CleaningSubmission[];
    inbox: AppNotification[];
  }) => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  showSiren: (title: string, message: string) => void;
  hideSiren: () => void;
  confirmMatch: (matchId: string, adminId: string) => void;
  adminCancelPendingMatch: (
    matchId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminRevokeConfirmedMatch: (
    matchId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminRevokeCleaning: (
    submissionId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminBroadcastNotice: (
    adminId: string,
    title: string,
    message: string
  ) => { success: boolean; message: string };
  submitMatchResult: (
    courtId: number,
    teamA: string[],
    teamB: string[],
    scoreA: number,
    scoreB: number,
    gameMode?: GameMode
  ) => void;
  submitCleaning: (submission: Omit<CleaningSubmission, 'id' | 'submittedAt' | 'points'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId?: string) => void;
  pushInbox: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { id?: string }) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  siren: { visible: false, title: '', message: '' },
  pendingMatches: MOCK_MATCH_RESULTS.filter((m) => m.status === 'pending'),
  matchHistory: MOCK_MATCH_RESULTS,
  cleaningLeaderboard: MOCK_CLEANING_LEADERBOARD,
  inbox: [
    {
      id: 'n1',
      type: 'join',
      title: '참가 요청',
      message: '서연님이 2번 코트 합류를 요청했어요',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      courtId: 2,
    },
    {
      id: 'n2',
      type: 'coach',
      title: '코칭 안내',
      message: '19:30 코치 코트 레슨이 곧 시작됩니다.',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'n3',
      type: 'system',
      title: '활동 안내',
      message: '오늘 정기 활동은 21:50까지입니다.',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ] as AppNotification[],

  hydrate: (data) =>
    set({
      pendingMatches: data.pendingMatches,
      matchHistory: data.matchHistory,
      cleaningLeaderboard: data.cleaningLeaderboard,
      inbox: data.inbox,
    }),

  showToast: (toast) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => get().dismissToast(id), toast.duration ?? 2500);
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showSiren: (title, message) => {
    set({ siren: { visible: true, title, message } });
    void pushLocalNotification(title, message, 'coach');
  },

  hideSiren: () =>
    set({ siren: { visible: false, title: '', message: '' } }),

  confirmMatch: (matchId, adminId) => {
    const match = get().pendingMatches.find((m) => m.id === matchId);
    if (!match) return;

    const authStore = useAuthStore.getState();
    const winners = match.winner === 'A' ? match.teamA : match.teamB;
    const losers = match.winner === 'A' ? match.teamB : match.teamA;

    const isRanked = match.gameMode === 'ranked';
    const eloChanges: Record<string, number> = {};

    winners.forEach((userId) => {
      const user = authStore.users.find((u) => u.id === userId);
      if (!user) return;
      const loserElos = losers.map((id) => authStore.users.find((u) => u.id === id)?.elo ?? 1000);
      const avgLoserElo = loserElos.reduce((a, b) => a + b, 0) / loserElos.length;
      if (isRanked) {
        const { winnerChange } = calculateEloChange(user.elo, avgLoserElo);
        eloChanges[userId] = winnerChange;
        authStore.updateUserElo(userId, winnerChange);
        const pts = calculateWinPoints(user.membershipTier, avgLoserElo, user.elo, true);
        if (pts > 0) {
          applyPointChange(userId, pts, 'match_win', '랭크전 승리 (관리자 확정)', { matchId });
        }
      }
    });

    if (isRanked) {
      losers.forEach((userId) => {
        const user = authStore.users.find((u) => u.id === userId);
        if (!user) return;
        const winnerElos = winners.map((id) => authStore.users.find((u) => u.id === id)?.elo ?? 1000);
        const avgWinnerElo = winnerElos.reduce((a, b) => a + b, 0) / winnerElos.length;
        const { loserChange } = calculateEloChange(avgWinnerElo, user.elo);
        eloChanges[userId] = loserChange;
        authStore.updateUserElo(userId, loserChange);
      });
      authStore.recordMatchStats(winners, losers);
    }

    const confirmedAt = new Date().toISOString();
    const patch = {
      status: 'confirmed' as const,
      confirmedBy: adminId,
      confirmedAt,
      eloChanges: isRanked ? eloChanges : undefined,
    };

    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.confirm',
      message: `코트 ${match.courtId} 경기 결과 확정 (A ${match.scoreA}:${match.scoreB} B)`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
  },

  adminCancelPendingMatch: (matchId, adminId, reason = '운영진 취소') => {
    const match = get().pendingMatches.find((m) => m.id === matchId && m.status === 'pending');
    if (!match) {
      return { success: false, message: '취소할 대기 경기를 찾을 수 없어요.' };
    }
    const patch = {
      status: 'cancelled' as const,
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminId,
      cancelReason: reason,
    };
    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.cancel',
      message: `코트 ${match.courtId} 경기 제출 취소 (A ${match.scoreA}:${match.scoreB} B)`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
    return { success: true, message: '경기 제출을 취소했어요.' };
  },

  adminRevokeConfirmedMatch: (matchId, adminId, reason = '운영진 철회') => {
    const match = get().matchHistory.find((m) => m.id === matchId && m.status === 'confirmed');
    if (!match) {
      return { success: false, message: '철회할 확정 경기를 찾을 수 없어요.' };
    }

    const authStore = useAuthStore.getState();
    const winners = match.winner === 'A' ? match.teamA : match.teamB;
    const losers = match.winner === 'A' ? match.teamB : match.teamA;
    const isRanked = match.gameMode === 'ranked';

    if (isRanked && match.eloChanges) {
      Object.entries(match.eloChanges).forEach(([userId, delta]) => {
        authStore.updateUserElo(userId, -delta);
      });
      authStore.reverseMatchStats(winners, losers);
    }

    const relatedTx = usePointStore.getState().transactions.filter(
      (t) => t.meta?.matchId === matchId && t.amount > 0
    );
    relatedTx.forEach((tx) => {
      applyPointChange(tx.userId, -tx.amount, 'admin', `경기 확정 철회 · ${reason}`, {
        matchId,
      });
    });

    const patch = {
      status: 'revoked' as const,
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminId,
      cancelReason: reason,
    };
    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.revoke',
      message: `코트 ${match.courtId} 확정 경기 철회`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
    return { success: true, message: '확정 경기를 철회하고 반영분을 되돌렸어요.' };
  },

  adminRevokeCleaning: (submissionId, adminId, reason = '운영진 취소') => {
    const entry = get().cleaningLeaderboard.find(
      (c) => c.id === submissionId && !c.revokedAt
    );
    if (!entry) {
      return { success: false, message: '취소할 청소 기록을 찾을 수 없어요.' };
    }

    applyPointChange(entry.userId, -entry.points, 'admin', `청소 인증 취소 · ${reason}`);
    useAuthStore.setState((state) => ({
      users: state.users.map((u) =>
        u.id === entry.userId
          ? { ...u, cleaningContributions: Math.max(0, u.cleaningContributions - 1) }
          : u
      ),
      currentUser:
        state.currentUser?.id === entry.userId
          ? {
              ...state.currentUser,
              cleaningContributions: Math.max(0, state.currentUser.cleaningContributions - 1),
            }
          : state.currentUser,
    }));

    const revokedAt = new Date().toISOString();
    set((state) => ({
      cleaningLeaderboard: state.cleaningLeaderboard.map((c) =>
        c.id === submissionId ? { ...c, revokedAt, revokedBy: adminId } : c
      ),
    }));
    recordAdminLogAsActor(adminId, {
      category: 'point',
      action: 'cleaning.revoke',
      message: `${entry.userName} 청소 인증 취소 (${entry.area})`,
      targetId: entry.userId,
      targetName: entry.userName,
    });
    persistAppState();
    return { success: true, message: '청소 인증을 취소하고 포인트를 회수했어요.' };
  },

  adminBroadcastNotice: (adminId, title, message) => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      return { success: false, message: '제목과 내용을 입력해 주세요.' };
    }

    const recipients = useAuthStore
      .getState()
      .users.filter((u) => u.memberStatus === 'approved' && u.membershipTier !== 'guest');

    recipients.forEach((u) => {
      get().pushInbox({
        type: 'system',
        title: trimmedTitle,
        message: trimmedMessage,
        targetUserId: u.id,
      });
    });

    recordAdminLogAsActor(adminId, {
      category: 'system',
      action: 'notice.broadcast',
      message: `전체 공지: ${trimmedTitle}`,
      meta: { count: recipients.length },
    });
    persistAppState();
    return {
      success: true,
      message: `승인 회원 ${recipients.length}명에게 공지를 보냈어요.`,
    };
  },

  submitMatchResult: (courtId, teamA, teamB, scoreA, scoreB, gameMode = 'casual') => {
    if (scoreA === scoreB) return;
    const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B';
    const match: MatchResult = {
      id: `match-${Date.now()}`,
      courtId,
      teamA,
      teamB,
      scoreA,
      scoreB,
      winner,
      status: 'pending',
      playedAt: new Date().toISOString(),
      gameMode,
    };
    set((state) => ({
      pendingMatches: [match, ...state.pendingMatches],
      matchHistory: [match, ...state.matchHistory],
    }));
    persistAppState();
  },

  submitCleaning: (submission) => {
    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === submission.userId);
    const points = user?.membershipTier === 'full' ? 18 : 15;

    const newEntry: CleaningSubmission = {
      ...submission,
      id: `clean-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      points,
    };

    if (user) {
      applyPointChange(user.id, points, 'cleaning', `청소 인증 · ${submission.area}`);
      useAuthStore.setState((state) => ({
        users: state.users.map((u) =>
          u.id === user.id ? { ...u, cleaningContributions: u.cleaningContributions + 1 } : u
        ),
        currentUser:
          state.currentUser?.id === user.id
            ? {
                ...state.currentUser,
                cleaningContributions: state.currentUser.cleaningContributions + 1,
              }
            : state.currentUser,
      }));
    }

    set((state) => ({
      cleaningLeaderboard: [newEntry, ...state.cleaningLeaderboard].slice(0, 10),
    }));
    persistAppState();
  },

  markNotificationRead: (id) => {
    set((state) => ({
      inbox: state.inbox.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    persistAppState();
  },

  markAllNotificationsRead: (userId?: string) => {
    set((state) => ({
      inbox: state.inbox.map((n) => {
        if (!userId) return { ...n, read: true };
        if (!n.targetUserId || n.targetUserId === userId) return { ...n, read: true };
        return n;
      }),
    }));
    persistAppState();
  },

  pushInbox: (n) => {
    const item: AppNotification = {
      id: n.id ?? `n-${Date.now()}`,
      type: n.type,
      title: n.title,
      message: n.message,
      courtId: n.courtId,
      targetUserId: n.targetUserId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ inbox: [item, ...state.inbox] }));
    persistAppState();
  },
}));
