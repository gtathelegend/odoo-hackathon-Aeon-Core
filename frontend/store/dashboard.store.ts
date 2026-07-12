import { create } from 'zustand';

export interface DashboardState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

/** Dashboard store. KPI wiring is implemented in a later prompt. */
export const useDashboardStore = create<DashboardState>((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
