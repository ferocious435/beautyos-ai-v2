import { create } from 'zustand';

interface AppState {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    name: 'Сергей Р.',
    role: 'Владелец',
  },
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
