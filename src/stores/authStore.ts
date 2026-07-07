import { create } from 'zustand';
import type { GeoLocation, User, AttendanceRecord, MembershipTier, MemberStatus, LessonAccessStatus } from '@/src/types';
import { MOCK_USERS, MOCK_ATTENDANCE } from '@/src/services/mockData';
import { AVATAR_COLORS } from '@/src/constants';
import { isWithinGymFence } from '@/src/services/geoFence';
import { hashPassword, verifyPassword, seedDemoCredentials } from '@/src/services/authCredentials';
import { applyPointMultiplier, getRankFromElo } from '@/src/services/points';
import { applyPointChange } from '@/src/services/pointLedger';
import { usePointStore } from './pointStore';
import { useNotificationStore } from './notificationStore';
import { persistAppState } from '@/src/services/appState';
import { recordAdminLog, recordAdminLogAsCurrentUser, recordAdminLogAsActor } from '@/src/services/adminLog';

const WELCOME_POINTS = 500;

function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface AuthState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  authHydrated: boolean;
  peakResetDate: string | null;
  lastCleaningBonusMonth: string | null;
  credentials: Record<string, string>;
  login: (studentId: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  register: (input: {
    studentId: string;
    name: string;
    email: string;
    password: string;
  }) => { success: boolean; message: string };
  hydrateAuth: (
    users: User[],
    attendanceRecords: AttendanceRecord[],
    sessionUserId: string | null,
    peakResetDate: string | null,
    credentials: Record<string, string>,
    lastCleaningBonusMonth: string | null
  ) => void;
  setAuthHydrated: () => void;
  approveMember: (userId: string) => void;
  rejectMember: (userId: string) => void;
  updateUserPoints: (userId: string, delta: number) => void;
  updateUserElo: (userId: string, delta: number) => void;
  syncUserRank: (userId: string) => void;
  incrementPeakReservations: (userId: string) => void;
  resetPeakReservationsIfNewDay: () => void;
  recordMatchStats: (winnerIds: string[], loserIds: string[]) => void;
  reverseMatchStats: (winnerIds: string[], loserIds: string[]) => void;
  attendanceRecords: AttendanceRecord[];
  checkIn: (userId: string) => { success: boolean; message: string };
  adminRevokeAttendance: (
    recordId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminForceCheckIn: (
    userId: string,
    adminId: string
  ) => { success: boolean; message: string };
  adminSetUserAtGym: (
    userId: string,
    atGym: boolean,
    adminId: string
  ) => { success: boolean; message: string };
  updateUserSchedule: (
    userId: string,
    arrivalTime: string,
    endTime?: string
  ) => { success: boolean; message: string };
  requestLessonAccess: (userId: string) => { success: boolean; message: string };
  approveLessonAccess: (userId: string) => { success: boolean; message: string };
  rejectLessonAccess: (userId: string) => { success: boolean; message: string };
  updateUserProfile: (
    userId: string,
    patch: { avatarUri?: string | null }
  ) => { success: boolean; message: string };
  setUserAtGym: (userId: string, atGym: boolean) => void;
  canPerformMemberAction: (userId: string) => { allowed: boolean; reason?: string };
  setLastCleaningBonusMonth: (month: string) => void;
  /** Discord 스타일 회원 관리 */
  adminSetMembershipTier: (
    userId: string,
    tier: MembershipTier
  ) => { success: boolean; message: string };
  adminSetMemberStatus: (
    userId: string,
    status: MemberStatus,
    reason?: string
  ) => { success: boolean; message: string };
  adminSetLessonStatus: (
    userId: string,
    status: LessonAccessStatus
  ) => { success: boolean; message: string };
  adminAdjustPoints: (
    userId: string,
    delta: number,
    reason: string
  ) => { success: boolean; message: string };
  adminAdjustElo: (userId: string, delta: number, reason: string) => { success: boolean; message: string };
  adminSetAdminNote: (userId: string, note: string) => { success: boolean; message: string };
  adminSendSystemNotice: (
    userId: string,
    title: string,
    message: string
  ) => { success: boolean; message: string };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    nickname: user.name,
    lessonStatus: user.lessonStatus ?? 'none',
  };
}

function normalizeUsers(users: User[]): User[] {
  return users.map(normalizeUser);
}

function syncCurrentUser(users: User[], currentId: string | null): User | null {
  if (!currentId) return null;
  return users.find((u) => u.id === currentId) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  users: MOCK_USERS,
  isAuthenticated: false,
  authHydrated: false,
  peakResetDate: null,
  lastCleaningBonusMonth: null,
  credentials: seedDemoCredentials(
    MOCK_USERS.map((u) => u.studentId)
  ),

  setAuthHydrated: () => set({ authHydrated: true }),

  hydrateAuth: (users, attendanceRecords, sessionUserId, peakResetDate, credentials, lastCleaningBonusMonth) => {
    const normalized = normalizeUsers(users);
    const currentUser = syncCurrentUser(normalized, sessionUserId);
    set({
      users: normalized,
      attendanceRecords,
      currentUser,
      isAuthenticated: !!currentUser,
      peakResetDate,
      credentials: seedDemoCredentials(
        normalized.map((u) => u.studentId),
        credentials
      ),
      lastCleaningBonusMonth,
      authHydrated: true,
    });
    get().resetPeakReservationsIfNewDay();
  },

  login: (studentId, password) => {
    const trimmed = studentId.trim();
    const user = get().users.find((u) => u.studentId === trimmed);
    if (!user) {
      return { success: false, message: '학번을 찾을 수 없어요. 회원가입을 먼저 해 주세요.' };
    }
    const storedHash = get().credentials[trimmed];
    if (!storedHash || !verifyPassword(password, storedHash)) {
      return { success: false, message: '비밀번호가 올바르지 않아요.' };
    }
    if (user.memberStatus === 'pending') {
      return { success: false, message: '가입 승인 대기 중이에요. 운영진 승인 후 로그인할 수 있어요.' };
    }
    if (user.memberStatus === 'rejected') {
      return { success: false, message: '가입이 거절되었어요. 운영진에게 문의해 주세요.' };
    }
    if (user.memberStatus === 'suspended') {
      return {
        success: false,
        message: user.suspendedReason
          ? `계정이 정지되었어요. 사유: ${user.suspendedReason}`
          : '계정이 정지되었어요. 운영진에게 문의해 주세요.',
      };
    }
    set({ currentUser: user, isAuthenticated: true });
    persistAppState();
    return { success: true, message: `${user.name}님, 환영합니다!` };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
    persistAppState();
  },

  register: ({ studentId, name, email, password }) => {
    const trimmedId = studentId.trim();
    const trimmedName = name.trim();
    if (!trimmedId || !trimmedName) {
      return { success: false, message: '학번과 이름을 입력해 주세요.' };
    }
    if (password.trim().length < 6) {
      return { success: false, message: '비밀번호는 6자 이상이어야 해요.' };
    }
    if (get().users.some((u) => u.studentId === trimmedId)) {
      return { success: false, message: '이미 등록된 학번이에요.' };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      studentId: trimmedId,
      name: trimmedName,
      nickname: trimmedName,
      email: email.trim() || `${trimmedId}@dgist.ac.kr`,
      membershipTier: 'associate',
      memberStatus: 'pending',
      rank: 'bronze',
      elo: 1000,
      points: 0,
      wins: 0,
      losses: 0,
      totalGames: 0,
      cleaningContributions: 0,
      peakTimeReservations: 0,
      lessonStatus: 'none',
      isAtGym: false,
      avatarColor: pickAvatarColor(get().users.length),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    set((state) => ({
      users: [...state.users, newUser],
      credentials: {
        ...state.credentials,
        [trimmedId]: hashPassword(password),
      },
    }));
    persistAppState();
    return {
      success: true,
      message: '가입 신청이 접수되었어요. 운영진 승인 후 로그인할 수 있어요.',
    };
  },

  approveMember: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.memberStatus !== 'pending') return;

    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, memberStatus: 'approved' as const } : u
      ),
    }));

    applyPointChange(userId, WELCOME_POINTS, 'welcome', '신입 부원 웰컴 리워드');
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.approve',
      message: `${user.name} 회원 가입 승인 (+${WELCOME_POINTS}P 웰컴)`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
  },

  rejectMember: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, memberStatus: 'rejected' as const } : u
      ),
    }));
    if (user) {
      recordAdminLogAsCurrentUser({
        category: 'member',
        action: 'member.reject',
        message: `${user.name} 회원 가입 거절`,
        targetId: userId,
        targetName: user.name,
      });
    }
    persistAppState();
  },

  updateUserPoints: (userId, delta) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, points: u.points + delta } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  updateUserElo: (userId, delta) =>
    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const elo = u.elo + delta;
        return { ...u, elo, rank: getRankFromElo(elo) };
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  syncUserRank: (userId) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, rank: getRankFromElo(u.elo) } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  incrementPeakReservations: (userId) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, peakTimeReservations: u.peakTimeReservations + 1 } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  resetPeakReservationsIfNewDay: () => {
    const today = todayKey();
    if (get().peakResetDate === today) return;
    set((state) => ({
      peakResetDate: today,
      users: state.users.map((u) => ({ ...u, peakTimeReservations: 0 })),
      currentUser: state.currentUser
        ? { ...state.currentUser, peakTimeReservations: 0 }
        : null,
    }));
  },

  recordMatchStats: (winnerIds, loserIds) =>
    set((state) => {
      const bump = (u: User, won: boolean) => ({
        ...u,
        wins: u.wins + (won ? 1 : 0),
        losses: u.losses + (won ? 0 : 1),
        totalGames: u.totalGames + 1,
      });
      let users = state.users;
      winnerIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, true) : u));
      });
      loserIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, false) : u));
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  reverseMatchStats: (winnerIds, loserIds) =>
    set((state) => {
      const bump = (u: User, won: boolean) => ({
        ...u,
        wins: Math.max(0, u.wins - (won ? 1 : 0)),
        losses: Math.max(0, u.losses - (won ? 0 : 1)),
        totalGames: Math.max(0, u.totalGames - 1),
      });
      let users = state.users;
      winnerIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, true) : u));
      });
      loserIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, false) : u));
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  attendanceRecords: MOCK_ATTENDANCE,

  checkIn: (userId) => {
    const today = todayKey();
    const existing = get().attendanceRecords.find(
      (r) => r.userId === userId && r.date === today
    );
    if (existing) {
      return { success: false, message: '오늘은 이미 출석했어요.' };
    }
    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId,
      date: today,
      checkedInAt: new Date().toISOString(),
    };
    set((state) => ({
      attendanceRecords: [record, ...state.attendanceRecords],
    }));

    const user = get().users.find((u) => u.id === userId);
    if (user) {
      const pts = applyPointMultiplier(100, user.membershipTier);
      usePointStore.getState().recordTransaction({
        userId,
        amount: pts,
        type: 'check_in',
        description: '체육관 출석 인증',
      });
      get().updateUserPoints(userId, pts);
      get().setUserAtGym(userId, true);
    }

    const ptsAwarded = user ? applyPointMultiplier(100, user.membershipTier) : 100;
    if (user) {
      recordAdminLog({
        category: 'attendance',
        action: 'attendance.check_in',
        message: `${user.name} 출석 인증 (+${ptsAwarded}P)`,
        actorId: userId,
        actorName: user.name,
        targetId: userId,
        targetName: user.name,
      });
    }
    persistAppState();
    return { success: true, message: `출석 완료! +${ptsAwarded}P 🏸` };
  },

  adminRevokeAttendance: (recordId, adminId, reason = '운영진 취소') => {
    const record = get().attendanceRecords.find((r) => r.id === recordId);
    if (!record) {
      return { success: false, message: '출석 기록을 찾을 수 없어요.' };
    }
    const user = get().users.find((u) => u.id === record.userId);

    set((state) => ({
      attendanceRecords: state.attendanceRecords.filter((r) => r.id !== recordId),
    }));

    if (user && record.date === todayKey()) {
      const pts = applyPointMultiplier(100, user.membershipTier);
      applyPointChange(user.id, -pts, 'admin', `출석 취소 · ${reason}`);
      get().setUserAtGym(user.id, false);
    }

    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.revoke',
      message: `${user?.name ?? record.userId} 출석 취소 (${record.date})`,
      targetId: record.userId,
      targetName: user?.name,
      meta: { recordId },
    });
    persistAppState();
    return {
      success: true,
      message: `${user?.name ?? '회원'}님의 출석을 취소했어요.`,
    };
  },

  adminForceCheckIn: (userId, adminId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원만 출석 처리할 수 있어요.' };
    }

    const result = get().checkIn(userId);
    if (!result.success) return result;

    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.admin_check_in',
      message: `${user.name} 출석 대리 인증`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: `${user.name}님 출석을 처리했어요.` };
  },

  adminSetUserAtGym: (userId, atGym, adminId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    get().setUserAtGym(userId, atGym);
    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.set_at_gym',
      message: `${user.name} 체육관 ${atGym ? '도착' : '미도착'} 처리`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님을 ${atGym ? '체육관 도착' : '미도착'}으로 표시했어요.`,
    };
  },

  updateUserSchedule: (userId, arrivalTime, endTime) => {
    const start = arrivalTime.trim();
    if (!/^\d{2}:\d{2}$/.test(start)) {
      return { success: false, message: '도착 시간을 HH:MM 형식으로 입력해 주세요. (예: 18:30)' };
    }
    const [sh, sm] = start.split(':').map(Number);
    if (sh > 23 || sm > 59) {
      return { success: false, message: '올바른 시간을 입력해 주세요.' };
    }

    let scheduledEnd: string | undefined;
    if (endTime?.trim()) {
      const end = endTime.trim();
      if (!/^\d{2}:\d{2}$/.test(end)) {
        return { success: false, message: '퇴장 시간을 HH:MM 형식으로 입력해 주세요.' };
      }
      const [eh, em] = end.split(':').map(Number);
      if (eh > 23 || em > 59) {
        return { success: false, message: '올바른 퇴장 시간을 입력해 주세요.' };
      }
      if (eh * 60 + em <= sh * 60 + sm) {
        return { success: false, message: '퇴장 시간은 도착 시간보다 늦어야 해요.' };
      }
      scheduledEnd = end;
    }

    const today = todayKey();
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              scheduleDate: today,
              scheduledStart: start,
              scheduledEnd,
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();
    return { success: true, message: `오늘 ${start} 도착으로 저장했어요.` };
  },

  requestLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };
    if (user.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원만 레슨 권한을 신청할 수 있어요.' };
    }
    if (user.lessonStatus === 'approved') {
      return { success: false, message: '이미 레슨 이용 권한이 있어요.' };
    }
    if (user.lessonStatus === 'pending') {
      return { success: false, message: '레슨 권한 승인 대기 중이에요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              lessonStatus: 'pending' as const,
              lessonRequestedAt: new Date().toISOString(),
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    recordAdminLog({
      category: 'lesson',
      action: 'lesson.request',
      message: `${user.name} 레슨 권한 신청`,
      actorId: userId,
      actorName: user.name,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: '레슨 권한 신청이 접수됐어요. 운영진 승인 후 이용할 수 있어요.',
    };
  },

  approveLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.lessonStatus !== 'pending') {
      return { success: false, message: '승인 대기 중인 레슨 신청이 없어요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, lessonStatus: 'approved' as const } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();

    useNotificationStore.getState().pushInbox({
      type: 'system',
      title: '레슨 권한 승인',
      message: '레슨 이용 권한이 부여됐어요. 대기열에 등록할 수 있습니다.',
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.approve',
      message: `${user.name} 레슨 이용 권한 승인`,
      targetId: userId,
      targetName: user.name,
    });

    return { success: true, message: `${user.name}님에게 레슨 권한을 부여했어요.` };
  },

  rejectLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.lessonStatus !== 'pending') {
      return { success: false, message: '승인 대기 중인 레슨 신청이 없어요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, lessonStatus: 'rejected' as const } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();
    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.reject',
      message: `${user.name} 레슨 권한 신청 거절`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: '레슨 권한 신청을 거절했어요.' };
  },

  updateUserProfile: (userId, patch) => {
    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u };
        if ('avatarUri' in patch) {
          if (patch.avatarUri) next.avatarUri = patch.avatarUri;
          else delete next.avatarUri;
        }
        return next;
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();
    return { success: true, message: '프로필 사진이 저장되었어요.' };
  },

  setUserAtGym: (userId, atGym) =>
    set((state) => {
      const target = state.users.find((u) => u.id === userId);
      if (!target || target.isAtGym === atGym) return state;

      const users = state.users.map((u) =>
        u.id === userId ? { ...u, isAtGym: atGym } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    }),

  canPerformMemberAction: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { allowed: false, reason: '사용자를 찾을 수 없어요.' };
    if (user.membershipTier === 'guest') {
      return { allowed: false, reason: '비회원은 이 기능을 사용할 수 없어요. 회원가입 후 이용해 주세요.' };
    }
    if (user.memberStatus !== 'approved') {
      if (user.memberStatus === 'suspended') {
        return { allowed: false, reason: '정지된 계정이에요. 운영진에게 문의해 주세요.' };
      }
      return { allowed: false, reason: '승인된 회원만 이용할 수 있어요.' };
    }
    return { allowed: true };
  },

  setLastCleaningBonusMonth: (month) => set({ lastCleaningBonusMonth: month }),

  adminSetMembershipTier: (userId, tier) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.membershipTier === 'admin' && tier !== 'admin') {
      const adminCount = get().users.filter((u) => u.membershipTier === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, message: '마지막 관리자 등급은 변경할 수 없어요.' };
      }
    }

    set((state) => {
      const users = state.users.map((u) => (u.id === userId ? { ...u, membershipTier: tier } : u));
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });

    const tierLabel =
      tier === 'admin' ? '관리자' : tier === 'full' ? '정회원' : tier === 'associate' ? '준회원' : '비회원';
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.tier',
      message: `${user.name} 등급 → ${tierLabel}`,
      targetId: userId,
      targetName: user.name,
      meta: { tier },
    });
    persistAppState();
    return { success: true, message: `${user.name}님의 등급을 ${tierLabel}(으)로 변경했어요.` };
  },

  adminSetMemberStatus: (userId, status, reason) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.membershipTier === 'admin' && status !== 'approved') {
      const adminCount = get().users.filter(
        (u) => u.membershipTier === 'admin' && u.memberStatus === 'approved'
      ).length;
      if (adminCount <= 1 && user.memberStatus === 'approved') {
        return { success: false, message: '마지막 관리자 계정은 정지·거절할 수 없어요.' };
      }
    }

    const now = new Date().toISOString();
    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next: User = { ...u, memberStatus: status };
        if (status === 'suspended') {
          next.suspendedReason = reason?.trim() || '운영진에 의한 정지';
          next.suspendedAt = now;
        } else {
          delete next.suspendedReason;
          delete next.suspendedAt;
        }
        return next;
      });
      let currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      let isAuthenticated = state.isAuthenticated;
      if (state.currentUser?.id === userId && status !== 'approved') {
        currentUser = null;
        isAuthenticated = false;
      }
      return { users, currentUser, isAuthenticated };
    });

    const statusLabel =
      status === 'approved'
        ? '승인'
        : status === 'pending'
          ? '승인 대기'
          : status === 'suspended'
            ? '정지'
            : '거절';
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: `member.status.${status}`,
      message: `${user.name} 계정 상태 → ${statusLabel}${reason ? ` (${reason})` : ''}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: `${user.name}님의 계정 상태를 변경했어요.` };
  },

  adminSetLessonStatus: (userId, status) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              lessonStatus: status,
              lessonRequestedAt:
                status === 'pending' ? new Date().toISOString() : u.lessonRequestedAt,
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });

    const label =
      status === 'approved'
        ? '레슨 권한 부여'
        : status === 'rejected'
          ? '레슨 권한 거절'
          : status === 'pending'
            ? '레슨 승인 대기'
            : '레슨 권한 초기화';
    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.admin_set',
      message: `${user.name} ${label}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: `${user.name}님의 레슨 권한을 변경했어요.` };
  },

  adminAdjustPoints: (userId, delta, reason) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, message: '0이 아닌 숫자를 입력해 주세요.' };
    }
    const trimmed = reason.trim();
    if (!trimmed) return { success: false, message: '조정 사유를 입력해 주세요.' };

    applyPointChange(userId, delta, 'admin', `운영진 조정 · ${trimmed}`);
    recordAdminLogAsCurrentUser({
      category: 'point',
      action: 'point.admin_adjust',
      message: `${user.name} 포인트 ${delta >= 0 ? '+' : ''}${delta}P (${trimmed})`,
      targetId: userId,
      targetName: user.name,
      meta: { delta },
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님 포인트 ${delta >= 0 ? '+' : ''}${delta}P 반영`,
    };
  },

  adminAdjustElo: (userId, delta, reason) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, message: '0이 아닌 숫자를 입력해 주세요.' };
    }
    const trimmed = reason.trim();
    if (!trimmed) return { success: false, message: '조정 사유를 입력해 주세요.' };

    get().updateUserElo(userId, delta);
    get().syncUserRank(userId);
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.elo_adjust',
      message: `${user.name} Elo ${delta >= 0 ? '+' : ''}${delta} (${trimmed})`,
      targetId: userId,
      targetName: user.name,
      meta: { delta },
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님 Elo ${delta >= 0 ? '+' : ''}${delta} 반영`,
    };
  },

  adminSetAdminNote: (userId, note) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u };
        const trimmed = note.trim();
        if (trimmed) next.adminNote = trimmed;
        else delete next.adminNote;
        return next;
      });
      return { users };
    });
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.note',
      message: `${user.name} 운영 메모 ${note.trim() ? '저장' : '삭제'}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: '운영 메모를 저장했어요.' };
  },

  adminSendSystemNotice: (userId, title, message) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) return { success: false, message: '제목과 내용을 입력해 주세요.' };

    useNotificationStore.getState().pushInbox({
      type: 'system',
      title: t,
      message: m,
      targetUserId: userId,
    });
    recordAdminLogAsCurrentUser({
      category: 'system',
      action: 'system.direct_message',
      message: `${user.name}에게 알림: ${t}`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: `${user.name}님에게 알림을 보냈어요.` };
  },
}));

interface AppState {
  isActivityTime: boolean;
  activityRemaining: string | null;
  nextActivityTime: number | null;
  isAtGym: boolean;
  location: GeoLocation | null;
  locationError: string | null;
  demoMode: boolean;
  setActivityTime: (value: boolean) => void;
  setLocation: (location: GeoLocation | null) => void;
  setLocationError: (error: string | null) => void;
  setDemoMode: (value: boolean) => void;
  checkGeoFence: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  isActivityTime: true,
  activityRemaining: null,
  nextActivityTime: null,
  isAtGym: true,
  location: null,
  locationError: null,
  demoMode: false,

  setActivityTime: (value) => {
    if (get().isActivityTime === value) return;
    set({ isActivityTime: value });
  },
  setLocation: (location) => {
    const atGym = location ? isWithinGymFence(location) : false;
    const demo = get().demoMode;
    set({ location, isAtGym: atGym || demo, locationError: null });
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser && !demo) {
      useAuthStore.getState().setUserAtGym(currentUser.id, atGym);
    }
  },
  setLocationError: (error) => set({ locationError: error }),
  setDemoMode: (value) => set({ demoMode: value, isAtGym: value ? true : get().isAtGym }),
  checkGeoFence: () => {
    const { demoMode, location } = get();
    if (demoMode) return true;
    const admin = useAuthStore.getState().currentUser;
    if (admin?.membershipTier === 'admin') return true;
    if (!location) return false;
    return isWithinGymFence(location);
  },
}));
