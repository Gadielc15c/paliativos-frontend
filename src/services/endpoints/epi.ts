import { httpClient } from "../http";
import type {
  EpiBreakdown, EpiBreakdownBy, EpiFilters, EpiPatientsPage, EpiSummary, EpiTop, EpiTrend,
} from "../../types/clinical";

/** Drops empty values so the backend applies its own defaults. */
export const epiParams = (filters: EpiFilters, extra: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries({ ...filters, ...extra }).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
  );

export const epiEndpoints = {
  summary: async (filters: EpiFilters) =>
    (await httpClient.get<EpiSummary>("/epi/summary", { params: epiParams(filters) })).data,
  top: async (filters: EpiFilters, limit = 10, level: "code" | "category" = "code") =>
    (await httpClient.get<EpiTop>("/epi/top-diagnoses", { params: epiParams(filters, { limit, level }) })).data,
  trend: async (filters: EpiFilters, opts: { interval: "day" | "week" | "month"; metric?: string; codes?: string[] }) =>
    (await httpClient.get<EpiTrend>("/epi/trend", {
      params: epiParams(filters, { interval: opts.interval, metric: opts.metric ?? "diagnoses", codes: opts.codes?.length ? opts.codes.join(",") : undefined }),
    })).data,
  breakdown: async (filters: EpiFilters, by: EpiBreakdownBy) =>
    (await httpClient.get<EpiBreakdown>("/epi/breakdown", { params: epiParams(filters, { by }) })).data,
  patientsByDiagnosis: async (filters: EpiFilters, code: string, page = 1, pageSize = 25) =>
    (await httpClient.get<EpiPatientsPage>("/epi/patients-by-diagnosis", { params: epiParams(filters, { code, page, page_size: pageSize }) })).data,
};
