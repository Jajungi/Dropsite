import { create } from 'zustand';
import type { CoachAnnouncement } from '@/src/types';
import { MOCK_COACH_ANNOUNCEMENTS } from '@/src/services/mockData';
import { persistAppState } from '@/src/services/appState';
import { recordAdminLogAsCurrentUser } from '@/src/services/adminLog';

interface CoachingState {
  announcements: CoachAnnouncement[];
  hydrate: (announcements: CoachAnnouncement[]) => void;
  postAnnouncement: (
    authorId: string,
    authorName: string,
    title: string,
    message: string
  ) => { success: boolean; message: string };
  removeAnnouncement: (id: string) => void;
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
  announcements: MOCK_COACH_ANNOUNCEMENTS,

  hydrate: (announcements) =>
    set({
      announcements: [...announcements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }),

  postAnnouncement: (authorId, authorName, title, message) => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      return { success: false, message: '제목과 내용을 입력해 주세요.' };
    }

    const entry: CoachAnnouncement = {
      id: `ca-${Date.now()}`,
      title: trimmedTitle,
      message: trimmedMessage,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    set((state) => ({
      announcements: [entry, ...state.announcements],
    }));
    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'coach.announcement',
      message: `코치 공지: ${trimmedTitle}`,
    });
    persistAppState();
    return { success: true, message: '코치 공지를 등록했어요.' };
  },

  removeAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));
    persistAppState();
  },
}));
