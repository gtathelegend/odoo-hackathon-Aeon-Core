import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
}

export interface NotificationState {
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
}

/** Notification store. Realtime wiring is implemented in a later prompt. */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
}));
