import { create } from 'zustand';

export type AppRole = 'client' | 'master' | 'admin';

interface AppState {
  user: {
    id: string;
    name: string;
    role: string;
    subscriptionTier: string;
    avatar?: string;
  };
  previewRole: AppRole | null;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  setUser: (user: { id: string; name: string; role: string; subscriptionTier: string; avatar?: string }) => void;
  setPreviewRole: (role: AppRole | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: '',
    name: '',
    role: '',
    subscriptionTier: 'free',
  },
  previewRole: null,
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  setUser: (user) => set({ user }),
  setPreviewRole: (role) => set({ previewRole: role }),
}));

export const useEffectiveRole = () =>
  useAppStore((state) => {
    const actualRole = (state.user.role || 'client') as AppRole;
    if (actualRole === 'admin' && state.previewRole) {
      return state.previewRole;
    }
    return actualRole;
  });
