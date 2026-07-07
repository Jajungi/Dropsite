import { create } from 'zustand';
import type { PointTransaction } from '@/src/types';
import { MOCK_POINT_TRANSACTIONS } from '@/src/services/mockData';
import { persistAppState } from '@/src/services/appState';

interface PointState {
  transactions: PointTransaction[];
  hydrate: (transactions: PointTransaction[]) => void;
  recordTransaction: (
    tx: Omit<PointTransaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => void;
  getTransactionsForUser: (userId: string) => PointTransaction[];
}

export const usePointStore = create<PointState>((set, get) => ({
  transactions: MOCK_POINT_TRANSACTIONS,

  hydrate: (transactions) => set({ transactions }),

  recordTransaction: (tx) => {
    const entry: PointTransaction = {
      ...tx,
      id: tx.id ?? `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: tx.createdAt ?? new Date().toISOString(),
    };
    set((state) => ({
      transactions: [entry, ...state.transactions],
    }));
    persistAppState();
  },

  getTransactionsForUser: (userId) =>
    get()
      .transactions.filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
}));
