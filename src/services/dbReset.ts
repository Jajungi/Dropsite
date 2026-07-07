import { isSupabaseEnabled } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { createEmptyCourts } from '@/src/services/courtService';
import { persistAppState } from '@/src/services/appState';
import type { User } from '@/src/types';

export type DbResetScope =
  | 'full'
  | 'activity_stats'
  | 'courts'
  | 'matches'
  | 'attendance'
  | 'points'
  | 'social'
  | 'notifications_logs'
  | 'guests'
  | 'pending_members';

export type DbResetDanger = 'critical' | 'high' | 'medium' | 'low';

export interface DbResetOption {
  scope: DbResetScope;
  title: string;
  description: string;
  effects: string[];
  danger: DbResetDanger;
}

export const DB_RESET_OPTIONS: DbResetOption[] = [
  {
    scope: 'courts',
    title: '코트 상태 초기화',
    description: '진행 중인 예약·경기·합류 신청만 비웁니다.',
    effects: ['9개 코트 모두 빈 상태', '회원 계정·포인트·기록은 유지'],
    danger: 'medium',
  },
  {
    scope: 'matches',
    title: '경기 기록 삭제',
    description: '확정·대기 중인 모든 경기 결과를 삭제합니다.',
    effects: ['match_results 테이블 비움', 'ELO·전적 숫자는 그대로 (별도 초기화 필요)'],
    danger: 'medium',
  },
  {
    scope: 'attendance',
    title: '출석·청소 기록 삭제',
    description: '출석 인증과 청소 제출 기록을 모두 삭제합니다.',
    effects: ['attendance_records 비움', 'cleaning_submissions 비움'],
    danger: 'medium',
  },
  {
    scope: 'points',
    title: '포인트 초기화',
    description: '모든 회원 포인트를 0으로 만들고 거래 내역을 삭제합니다.',
    effects: ['전 회원 points = 0', 'point_transactions 비움'],
    danger: 'high',
  },
  {
    scope: 'social',
    title: '소셜·레슨 데이터 삭제',
    description: '친구 신청, 로비 방, 코치 공지, 레슨 대기열을 삭제합니다.',
    effects: ['friend_requests · team_rooms · coach_announcements · lesson_queue 비움'],
    danger: 'medium',
  },
  {
    scope: 'notifications_logs',
    title: '알림·로그 삭제',
    description: '회원 알림함과 관리자 활동 로그만 삭제합니다.',
    effects: ['notifications · admin_logs 비움'],
    danger: 'low',
  },
  {
    scope: 'guests',
    title: '게스트 계정 삭제',
    description: '게스트로 입장한 임시 계정만 삭제합니다.',
    effects: ['membership_tier = guest 계정 삭제', '코트 상태도 함께 초기화'],
    danger: 'high',
  },
  {
    scope: 'pending_members',
    title: '승인 대기 계정 삭제',
    description: '가입 승인을 기다리는 계정만 삭제합니다.',
    effects: ['member_status = pending 계정 삭제', '코트 상태도 함께 초기화'],
    danger: 'high',
  },
  {
    scope: 'activity_stats',
    title: '활동·통계 전체 초기화',
    description: '계정은 유지하고 포인트·ELO·전적·코트·모든 활동 기록을 리셋합니다.',
    effects: [
      '회원 계정·승인 상태·관리자 권한 유지',
      '포인트/ELO/전적 0·브론즈로 리셋',
      '코트·경기·출석·포인트·소셜·알림·로그 전부 비움',
    ],
    danger: 'critical',
  },
  {
    scope: 'full',
    title: '완전 초기화',
    description: '모든 계정과 데이터를 삭제합니다. 관리자 계정도 삭제됩니다.',
    effects: [
      '모든 auth 계정 삭제 (본인 포함)',
      '모든 테이블 데이터 삭제',
      '실행 후 다시 회원가입 필요',
    ],
    danger: 'critical',
  },
];

export function generateResetConfirmCode(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
}

function resetMemberStats(user: User): User {
  return {
    ...user,
    elo: 1000,
    rank: 'bronze',
    points: 0,
    wins: 0,
    losses: 0,
    totalGames: 0,
    cleaningContributions: 0,
    peakTimeReservations: 0,
    isAtGym: false,
    scheduleDate: undefined,
    scheduledStart: undefined,
    scheduledEnd: undefined,
    lessonStatus: 'none',
    lessonRequestedAt: undefined,
  };
}

function resetCourtsLocal() {
  useCourtStore.getState().hydrateCourts(createEmptyCourts());
}

function resetActivityTablesLocal() {
  usePointStore.getState().hydrate([]);
  useNotificationStore.getState().hydrate({
    pendingMatches: [],
    matchHistory: [],
    cleaningLeaderboard: [],
    inbox: [],
  });
  useFriendStore.getState().hydrate({}, []);
  useLobbyStore.getState().hydrateRooms([]);
  useLessonStore.getState().hydrate([], []);
  useCoachingStore.getState().hydrate([]);
  useAdminLogStore.getState().hydrate([]);
  useAuthStore.setState({ attendanceRecords: [], peakResetDate: null, lastCleaningBonusMonth: null });
}

function executeLocalReset(scope: DbResetScope): { deletedUsers: number; requiresLogout: boolean } {
  const state = useAuthStore.getState();
  let users = state.users;
  let deletedUsers = 0;
  let requiresLogout = false;

  switch (scope) {
    case 'courts':
      resetCourtsLocal();
      break;

    case 'matches':
      useNotificationStore.getState().hydrate({
        pendingMatches: [],
        matchHistory: [],
        cleaningLeaderboard: useNotificationStore.getState().cleaningLeaderboard,
        inbox: useNotificationStore.getState().inbox,
      });
      break;

    case 'attendance':
      useAuthStore.setState({ attendanceRecords: [] });
      useNotificationStore.getState().hydrate({
        pendingMatches: useNotificationStore.getState().pendingMatches,
        matchHistory: useNotificationStore.getState().matchHistory,
        cleaningLeaderboard: [],
        inbox: useNotificationStore.getState().inbox,
      });
      break;

    case 'points':
      users = users.map((u) => ({ ...u, points: 0 }));
      useAuthStore.setState({ users, currentUser: users.find((u) => u.id === state.currentUser?.id) ?? null });
      usePointStore.getState().hydrate([]);
      break;

    case 'social':
      useFriendStore.getState().hydrate({}, []);
      useLobbyStore.getState().hydrateRooms([]);
      useCoachingStore.getState().hydrate([]);
      useLessonStore.getState().hydrate([], []);
      break;

    case 'notifications_logs':
      useNotificationStore.getState().hydrate({
        pendingMatches: useNotificationStore.getState().pendingMatches,
        matchHistory: useNotificationStore.getState().matchHistory,
        cleaningLeaderboard: useNotificationStore.getState().cleaningLeaderboard,
        inbox: [],
      });
      useAdminLogStore.getState().hydrate([]);
      break;

    case 'guests':
      resetCourtsLocal();
      deletedUsers = users.filter((u) => u.membershipTier === 'guest').length;
      users = users.filter((u) => u.membershipTier !== 'guest');
      if (state.currentUser?.membershipTier === 'guest') requiresLogout = true;
      useAuthStore.setState({
        users,
        currentUser: requiresLogout ? null : users.find((u) => u.id === state.currentUser?.id) ?? null,
        isAuthenticated: !requiresLogout && Boolean(users.find((u) => u.id === state.currentUser?.id)),
      });
      break;

    case 'pending_members':
      resetCourtsLocal();
      deletedUsers = users.filter((u) => u.memberStatus === 'pending').length;
      users = users.filter((u) => u.memberStatus !== 'pending');
      useAuthStore.setState({
        users,
        currentUser: users.find((u) => u.id === state.currentUser?.id) ?? null,
      });
      break;

    case 'activity_stats':
      resetCourtsLocal();
      resetActivityTablesLocal();
      users = users.map(resetMemberStats);
      useAuthStore.setState({
        users,
        currentUser: users.find((u) => u.id === state.currentUser?.id) ?? null,
      });
      break;

    case 'full':
      resetCourtsLocal();
      resetActivityTablesLocal();
      users = [];
      deletedUsers = state.users.length;
      requiresLogout = true;
      useAuthStore.setState({
        users: [],
        currentUser: null,
        isAuthenticated: false,
        attendanceRecords: [],
        credentials: {},
        peakResetDate: null,
        lastCleaningBonusMonth: null,
      });
      break;
  }

  persistAppState();
  return { deletedUsers, requiresLogout };
}

async function rehydrateSupabaseAfterReset(
  scope: DbResetScope,
  adminId: string | null,
  isAdmin: boolean
): Promise<{ requiresLogout: boolean; deletedUsers: number }> {
  if (scope === 'full') {
    return { requiresLogout: true, deletedUsers: 0 };
  }

  const [
    { fetchAllProfiles },
    { fetchCourts },
    { fetchPointTransactions },
    { fetchAttendance },
    { fetchMatchResults },
    { fetchCleaningSubmissions },
    { fetchNotifications },
    { fetchAdminLogs },
    social,
  ] = await Promise.all([
    import('@/src/services/supabase/profiles'),
    import('@/src/services/supabase/courts'),
    import('@/src/services/supabase/points'),
    import('@/src/services/supabase/attendance'),
    import('@/src/services/supabase/matches'),
    import('@/src/services/supabase/submissions'),
    import('@/src/services/supabase/notifications'),
    import('@/src/services/supabase/adminLogs'),
    import('@/src/services/supabase/social'),
  ]);

  const users = await fetchAllProfiles();
  const sessionId = useAuthStore.getState().currentUser?.id ?? adminId;
  const currentUser = sessionId ? users.find((u) => u.id === sessionId) ?? null : null;

  useAuthStore.getState().hydrateAuth(
    users,
    scope === 'attendance' || scope === 'activity_stats' ? [] : useAuthStore.getState().attendanceRecords,
    sessionId,
    null,
    {},
    null
  );
  useAuthStore.setState({
    currentUser,
    isAuthenticated: Boolean(currentUser),
    isGuestSession: currentUser?.membershipTier === 'guest',
  });

  if (scope === 'courts' || scope === 'activity_stats' || scope === 'guests' || scope === 'pending_members') {
    const courts = await fetchCourts();
    if (courts.length) useCourtStore.getState().hydrateCourts(courts);
  }

  if (scope === 'activity_stats' || scope === 'points') {
    if (sessionId) {
      const tx = await fetchPointTransactions(sessionId);
      usePointStore.getState().hydrate(tx);
    } else {
      usePointStore.getState().hydrate([]);
    }
  }

  if (scope === 'activity_stats' || scope === 'matches') {
    const matches = await fetchMatchResults();
    useNotificationStore.getState().hydrate({
      pendingMatches: matches.filter((m) => m.status === 'pending'),
      matchHistory: matches,
      cleaningLeaderboard: useNotificationStore.getState().cleaningLeaderboard,
      inbox: useNotificationStore.getState().inbox,
    });
  }

  if (scope === 'activity_stats' || scope === 'attendance') {
    if (sessionId) {
      const attendance = await fetchAttendance(sessionId);
      useAuthStore.setState({ attendanceRecords: attendance });
    }
    const cleaning = await fetchCleaningSubmissions();
    useNotificationStore.getState().hydrate({
      pendingMatches: useNotificationStore.getState().pendingMatches,
      matchHistory: useNotificationStore.getState().matchHistory,
      cleaningLeaderboard: cleaning,
      inbox: useNotificationStore.getState().inbox,
    });
  }

  if (scope === 'activity_stats' || scope === 'social') {
    if (sessionId) {
      const friendData = await social.fetchFriendData(sessionId);
      useFriendStore.getState().hydrate(friendData.friendships, friendData.requests);
    } else {
      useFriendStore.getState().hydrate({}, []);
    }
    useCoachingStore.getState().hydrate(await social.fetchCoachAnnouncements());
    useLessonStore.getState().hydrate([], await social.fetchLessonQueue());
    useLobbyStore.getState().hydrateRooms(await social.fetchTeamRooms());
  }

  if (scope === 'activity_stats' || scope === 'notifications_logs') {
    if (sessionId) {
      const inbox = await fetchNotifications(sessionId);
      useNotificationStore.getState().hydrate({
        pendingMatches: useNotificationStore.getState().pendingMatches,
        matchHistory: useNotificationStore.getState().matchHistory,
        cleaningLeaderboard: useNotificationStore.getState().cleaningLeaderboard,
        inbox,
      });
    }
    if (isAdmin) {
      useAdminLogStore.getState().hydrate(await fetchAdminLogs());
    } else {
      useAdminLogStore.getState().hydrate([]);
    }
  }

  if (scope === 'guests' || scope === 'pending_members') {
    const courts = await fetchCourts();
    if (courts.length) useCourtStore.getState().hydrateCourts(courts);
  }

  return { requiresLogout: false, deletedUsers: 0 };
}

export async function executeDbReset(scope: DbResetScope): Promise<{
  success: boolean;
  message: string;
  requiresLogout: boolean;
  deletedUsers?: number;
}> {
  if (isSupabaseEnabled()) {
    const { getSupabase } = await import('@/src/lib/supabase');
    const { data, error } = await getSupabase().rpc('rpc_admin_reset_data', { p_scope: scope });
    if (error) {
      const hint =
        error.message.includes('unknown reset scope') || error.message.includes('function')
          ? ' Supabase SQL Editor에서 supabase/011_admin_db_reset.sql 을 실행했는지 확인하세요.'
          : '';
      return { success: false, message: `${error.message}${hint}`, requiresLogout: false };
    }

    const deletedUsers = Number((data as { deleted_users?: number })?.deleted_users ?? 0);
    const admin = useAuthStore.getState().currentUser;
    const { requiresLogout } = await rehydrateSupabaseAfterReset(
      scope,
      admin?.id ?? null,
      admin?.membershipTier === 'admin'
    );

    return {
      success: true,
      message: '데이터베이스 리셋이 완료되었습니다.',
      requiresLogout,
      deletedUsers,
    };
  }

  const { deletedUsers, requiresLogout } = executeLocalReset(scope);
  return {
    success: true,
    message: '로컬 데이터 리셋이 완료되었습니다.',
    requiresLogout,
    deletedUsers,
  };
}
