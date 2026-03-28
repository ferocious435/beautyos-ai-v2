import { create } from 'zustand';

interface AppState {
  user: {
    id: string;
    name: string;
    role: string;
    subscriptionTier: string;
    avatar?: string;
  };
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  setUser: (user: { id: string; name: string; role: string; subscriptionTier: string; avatar?: string }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: '',
    name: '',
    role: '',
    subscriptionTier: 'free',
  },
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  setUser: (user) => set({ user }),
}));
