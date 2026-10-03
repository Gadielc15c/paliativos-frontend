import type { ReactNode } from "react";
import { useAppStore } from "../app/store/useAppStore";
import { Unauthorized } from "../components/states/StateContainers";
import type { Permission } from "../types/common";

/** Client-side gate for menus and screens. A 403 with `details.missing` stays the authoritative check. */
export function usePermission(...required: Permission[]): boolean {
  const permissions = useAppStore((s) => s.permissions);
  return required.every((p) => permissions.includes(p));
}

export function RequirePermission({ permissions, children }: { permissions: Permission[]; children: ReactNode }) {
  const allowed = usePermission(...permissions);
  return allowed ? <>{children}</> : <Unauthorized />;
}
