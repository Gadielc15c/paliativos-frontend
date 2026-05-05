import { create } from "zustand";
import type { AppStoreState } from "../../types/state";

export const useAppStore = create<AppStoreState>((set) => {
  return {
    // Auth & User
    user: null,
    permissions: [],
    isAuthenticated: false,

    // UI
    notifications: [],
    sidebarCollapsed: false,
    sidebarMobileOpen: false,

    // Actions
    setUser: (newUser) =>
      set({
        user: newUser,
        isAuthenticated: !!newUser,
      }),

    setPermissions: (newPermissions) => set({ permissions: newPermissions }),

    addNotification: (notification) =>
      set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        ],
      })),

    removeNotification: (id) =>
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),

    toggleSidebar: () =>
      set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed,
      })),

    toggleSidebarMobile: () =>
      set((state) => ({
        sidebarMobileOpen: !state.sidebarMobileOpen,
      })),

    closeSidebarMobile: () =>
      set({
        sidebarMobileOpen: false,
      }),
  };
});
