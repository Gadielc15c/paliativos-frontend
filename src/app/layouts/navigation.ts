import { Activity, DollarSign, FolderOpen, Home, BarChart3, History, Settings2, SlidersHorizontal, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { Permission } from "../../types/common";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Hidden when the role lacks it (403 from the API stays authoritative). */
  permission?: Permission;
  /** Other paths that light this item up. */
  match: string[];
}

/** The five primary destinations. Everything else lives inside one of them. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", path: "/", icon: Home, match: ["/"] },
  { label: "Pacientes", path: "/patients", icon: Users, permission: "patients:read", match: ["/patients", "/consultations", "/episodes"] },
  { label: "Epidemiología", path: "/epidemiologia", icon: Activity, permission: "epi:read", match: ["/epidemiologia"] },
  { label: "Facturación", path: "/billing", icon: DollarSign, permission: "billing:read", match: ["/billing", "/finance"] },
  { label: "Administración", path: "/admin", icon: Settings2, match: ["/admin", "/equipo", "/audit", "/reports", "/documents", "/config", "/secretaries"] },
];

export interface AdminLink {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  permission?: Permission;
}

/** Administración hub, grouped like iOS Settings. */
export const ADMIN_GROUPS: Array<{ title: string; items: AdminLink[] }> = [
  {
    title: "Personas",
    items: [
      { label: "Equipo", description: "Médicos, secretarias y sus accesos", path: "/equipo", icon: UsersRound, permission: "staff:manage" },
    ],
  },
  {
    title: "Información",
    items: [
      { label: "Documentos", description: "Subir y revisar estudios e informes", path: "/documents", icon: FolderOpen, permission: "documents:read" },
      { label: "Reportes", description: "Pacientes, ingresos y gastos por médico", path: "/reports", icon: BarChart3, permission: "reports:read" },
      { label: "Registro de actividad", description: "Quién hizo qué y cuándo", path: "/audit", icon: History, permission: "audit:read" },
    ],
  },
  {
    title: "Preferencias",
    items: [
      { label: "Ajustes visuales", description: "Tema, tamaño de letra y movimiento", path: "/config", icon: SlidersHorizontal },
    ],
  },
];

export const isNavActive = (item: NavItem, pathname: string) =>
  item.path === "/" ? pathname === "/" : item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
