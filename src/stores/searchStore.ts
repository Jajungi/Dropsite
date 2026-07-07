import { create } from 'zustand';

interface SearchState {
  query: string;
  setQuery: (query: string) => void;
  clearQuery: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clearQuery: () => set({ query: '' }),
}));

export function filterUsersByQuery<T extends { name: string; studentId: string }>(
  users: T[],
  query: string
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return users.filter(
    (u) => u.name.toLowerCase().includes(trimmed) || u.studentId.includes(trimmed)
  );
}
