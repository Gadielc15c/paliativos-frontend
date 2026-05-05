// Tipos para estado global de la app
import type { User, Permission } from "./common";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  timestamp: string;
}

export interface AppStoreState {
  // Auth & User
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;

  // UI
  notifications: Notification[];
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setPermissions: (permissions: Permission[]) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  toggleSidebar: () => void;
  toggleSidebarMobile: () => void;
  closeSidebarMobile: () => void;
}
