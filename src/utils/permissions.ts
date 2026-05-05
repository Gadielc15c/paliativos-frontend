// Utilidades de permisos
import type { Permission, UserRole } from "../types/common";

export const hasPermission = (
  permissions: Permission[],
  required: Permission
): boolean => {
  return permissions.includes(required);
};

export const hasAnyPermission = (
  permissions: Permission[],
  required: Permission[]
): boolean => {
  return required.some((p) => permissions.includes(p));
};

export const hasAllPermissions = (
  permissions: Permission[],
  required: Permission[]
): boolean => {
  return required.every((p) => permissions.includes(p));
};

export const canAccess = (
  userRole: UserRole,
  resource: string
): boolean => {
  const rolePermissions: Record<UserRole, string[]> = {
    admin: ["patients", "billing", "episodes", "finance", "documents", "reports", "audit", "secretaries"],
    doctor: ["patients", "billing", "episodes", "finance", "documents"],
    secretary: ["patients", "billing", "documents"],
  };

  return rolePermissions[userRole]?.includes(resource) || false;
};
