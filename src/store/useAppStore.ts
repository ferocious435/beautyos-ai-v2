import { create } from 'zustand';

interface AppState {
  user: {
    name: string;
    role: string;
    subscriptionTier: string;
    avatar?: string;
  };
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    name: '',
    role: '',
    subscriptionTier: 'free',
  },
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
