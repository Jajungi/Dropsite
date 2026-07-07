import { create } from 'zustand';

/** 관리자 알림함에서 '확인'하여 숨긴 알림 id 집합 (세션 단위) */
interface AdminAlertState {
  dismissed: string[];
  dismiss: (id: string) => void;
  isDismissed: (id: string) => boolean;
  restore: (id: string) => void;
  clear: () => void;
}

export const useAdminAlertStore = create<AdminAlertState>((set, get) => ({
  dismissed: [],
  dismiss: (id) =>
    set((state) =>
      state.dismissed.includes(id) ? state : { dismissed: [...state.dismissed, id] }
    ),
  isDismissed: (id) => get().dismissed.includes(id),
  restore: (id) => set((state) => ({ dismissed: state.dismissed.filter((d) => d !== id) })),
  clear: () => set({ dismissed: [] }),
}));
