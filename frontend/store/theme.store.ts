import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/** Theme store. */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  setMode: (mode) => set({ mode }),
  toggle: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
}));
