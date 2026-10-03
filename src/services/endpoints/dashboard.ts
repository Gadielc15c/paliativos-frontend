import { httpClient } from "../http";
import type {
  DashboardActivity, DashboardAlerts, DashboardKpis, DashboardParams, DashboardQuality, DashboardToday,
} from "../../types/dashboard";

const clean = (p: DashboardParams = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** Home dashboard. `alerts`/`today` work for every role; `kpis`/`activity`/`quality` need clinical:read. */
export const dashboardEndpoints = {
  alerts: async (p?: DashboardParams) => (await httpClient.get<DashboardAlerts>("/dashboard/alerts", { params: clean(p) })).data,
  today: async (p?: DashboardParams) => (await httpClient.get<DashboardToday>("/dashboard/today", { params: clean(p) })).data,
  kpis: async (p?: DashboardParams) => (await httpClient.get<DashboardKpis>("/dashboard/kpis", { params: clean(p) })).data,
  activity: async (p?: DashboardParams) => (await httpClient.get<DashboardActivity>("/dashboard/activity", { params: clean(p) })).data,
  quality: async (p?: DashboardParams) => (await httpClient.get<DashboardQuality>("/dashboard/quality", { params: clean(p) })).data,
};
