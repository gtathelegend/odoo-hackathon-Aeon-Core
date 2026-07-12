import { create } from 'zustand';

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  clear: () => void;
}

/** Authentication store. Full flow is implemented in a later prompt. */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
  clear: () => set({ token: null, isAuthenticated: false }),
}));
