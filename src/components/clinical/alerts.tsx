import "./clinical.css";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, Eye, Info, type LucideIcon } from "lucide-react";
import { dashboardEndpoints } from "../../services/endpoints/dashboard";
import type { AlertSeverity, DashboardAlert } from "../../types/dashboard";

/** Severity is never color alone: icon + plain-Spanish label (status hue only on the icon/tint). */
export const SEVERITY_META: Record<AlertSeverity, { label: string; heading: string; icon: LucideIcon }> = {
  alert: { label: "Alerta", heading: "Requiere atención", icon: AlertOctagon },
  watch: { label: "Vigilar", heading: "Para vigilar", icon: Eye },
  info: { label: "Info", heading: "Para tu información", icon: Info },
};

export const ALERTS_KEY = ["dashboard", "alerts"] as const;

/** Shared query for /dashboard/alerts (Inicio and the patient header read the same cache). */
export function useDashboardAlerts() {
  return useQuery({ queryKey: ALERTS_KEY, queryFn: () => dashboardEndpoints.alerts(), staleTime: 60 * 1000, retry: 1 });
}

/** Clinical alerts that mention this patient. Money alerts stay in Facturación/Finanzas (clinical-first header). */
export function usePatientAlerts(patientId: string | null | undefined): DashboardAlert[] {
  const { data } = useDashboardAlerts();
  if (!patientId || !data) return [];
  return data.items.filter((a) => a.type !== "unpaid_invoices" && a.patients.some((p) => p.id === patientId));
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const m = SEVERITY_META[severity];
  return <span className="sev-pill" data-severity={severity}><m.icon size={14} aria-hidden="true" />{m.label}</span>;
}
