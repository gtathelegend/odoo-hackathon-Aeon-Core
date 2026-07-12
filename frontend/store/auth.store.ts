import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthRole = 'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'ASSET_MANAGER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AuthRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setSession: (user: AuthUser, tokens: AuthTokens) => void;
  setUser: (user: AuthUser | null) => void;
  updateAccessToken: (accessToken: string, refreshToken?: string) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

/** Persistent auth store. Hydrated from localStorage on the client. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      setSession: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),
      setUser: (user) => set({ user }),
      updateAccessToken: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
          isAuthenticated: Boolean(state.user ?? true),
        })),
      clear: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'assetflow.auth',
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
