import { create } from 'zustand';
import type { AdminLogEntry } from '@/src/types';

const MAX_LOGS = 200;

interface AdminLogState {
  logs: AdminLogEntry[];
  hydrate: (logs: AdminLogEntry[]) => void;
  append: (entry: Omit<AdminLogEntry, 'id' | 'createdAt'>) => void;
  clear: () => void;
}

export const useAdminLogStore = create<AdminLogState>((set) => ({
  logs: [],

  hydrate: (logs) => set({ logs: logs.slice(0, MAX_LOGS) }),

  append: (entry) => {
    const log: AdminLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      logs: [log, ...state.logs].slice(0, MAX_LOGS),
    }));
  },

  clear: () => set({ logs: [] }),
}));
