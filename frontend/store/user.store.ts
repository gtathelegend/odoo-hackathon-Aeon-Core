import { create } from 'zustand';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface UserState {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
}

/** Current-user store. Populated in a later prompt. */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
