import { create } from 'zustand';
import type { TeamRoom, TeamMember } from '@/src/types';
import { MOCK_TEAM_ROOMS } from '@/src/services/mockData';
import { isRankEligible } from '@/src/services/elo';
import type { RankTier } from '@/src/types';
import { saveRooms } from '@/src/services/persistence';
import { useAuthStore } from './authStore';

interface LobbyState {
  rooms: TeamRoom[];
  createRoom: (params: {
    hostId: string;
    hostName: string;
    hostRank: RankTier;
    hostAvatarColor: string;
    title: string;
    minRank?: RankTier;
    maxRank?: RankTier;
    password?: string;
  }) => { success: boolean; message: string };
  joinRoom: (
    roomId: string,
    member: TeamMember,
    password?: string
  ) => { success: boolean; message: string };
  leaveRoom: (roomId: string, userId: string) => void;
  markRoomReserved: (roomId: string, courtId: number) => void;
  adminCloseRoom: (roomId: string) => { success: boolean; message: string };
  hydrateRooms: (rooms: TeamRoom[]) => void;
}

function persistRooms(rooms: TeamRoom[]) {
  saveRooms(rooms).catch(() => {});
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: MOCK_TEAM_ROOMS,

  hydrateRooms: (rooms) => set({ rooms }),

  createRoom: (params) => {
    const memberCheck = useAuthStore.getState().canPerformMemberAction(params.hostId);
    if (!memberCheck.allowed) {
      return { success: false, message: memberCheck.reason ?? '모집방을 만들 수 없어요.' };
    }

    const hostMember: TeamMember = {
      userId: params.hostId,
      name: params.hostName,
      rank: params.hostRank,
      avatarColor: params.hostAvatarColor,
    };
    const newRoom: TeamRoom = {
      id: `room-${Date.now()}`,
      hostId: params.hostId,
      hostName: params.hostName,
      title: params.title,
      minRank: params.minRank,
      maxRank: params.maxRank,
      members: [hostMember],
      minMembers: 2,
      maxMembers: 4,
      status: 'open',
      createdAt: new Date().toISOString(),
      password: params.password || undefined,
    };
    const rooms = [newRoom, ...get().rooms];
    set({ rooms });
    persistRooms(rooms);
    return { success: true, message: '모집방이 생성되었어요.' };
  },

  joinRoom: (roomId, member, password) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.password && room.password !== password) {
      return { success: false, message: '비밀번호가 일치하지 않아요.' };
    }
    if (room.members.length >= room.maxMembers) {
      return { success: false, message: '방이 가득 찼어요.' };
    }
    if (!isRankEligible(member.rank, room.minRank, room.maxRank)) {
      return { success: false, message: '랭크 조건에 맞지 않아요.' };
    }
    if (room.members.some((m) => m.userId === member.userId)) {
      return { success: false, message: '이미 참여 중이에요.' };
    }

    const rooms = get().rooms.map((r) => {
      if (r.id !== roomId) return r;
      const members = [...r.members, member];
      return {
        ...r,
        members,
        status: members.length >= r.minMembers ? ('ready' as const) : r.status,
      };
    });
    set({ rooms });
    persistRooms(rooms);
    return { success: true, message: '방에 참여했어요!' };
  },

  leaveRoom: (roomId, userId) => {
    const rooms = get().rooms
      .map((r) => {
        if (r.id !== roomId) return r;
        const members = r.members.filter((m) => m.userId !== userId);
        if (members.length === 0) return null;
        const isHost = r.hostId === userId;
        return {
          ...r,
          hostId: isHost ? members[0].userId : r.hostId,
          hostName: isHost ? members[0].name : r.hostName,
          members,
          status: members.length < r.minMembers ? ('open' as const) : r.status,
        };
      })
      .filter(Boolean) as TeamRoom[];
    set({ rooms });
    persistRooms(rooms);
  },

  markRoomReserved: (roomId, _courtId) => {
    const rooms = get().rooms.map((r) =>
      r.id === roomId ? { ...r, status: 'reserved' as const } : r
    );
    set({ rooms });
    persistRooms(rooms);
  },

  adminCloseRoom: (roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '모집방을 찾을 수 없어요.' };
    const rooms = get().rooms.filter((r) => r.id !== roomId);
    set({ rooms });
    persistRooms(rooms);
    return { success: true, message: `「${room.title}」 모집방을 종료했어요.` };
  },
}));
