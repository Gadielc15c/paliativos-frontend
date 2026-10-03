import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { EpiFilters } from "../../../types/clinical";
import { CATEGORY_LABELS } from "./plain";

/** Epi filters plus the backend `category` key (GET /epi/categories); sent as-is to every /epi call. */
export type EpiQueryFilters = EpiFilters & { category?: string };

export type PeriodKey = "7d" | "30d" | "90d" | "12m" | "custom";
export const PERIODS: Array<{ value: PeriodKey; label: string; days: number }> = [
  { value: "7d", label: "7 días", days: 7 },
  { value: "30d", label: "30 días", days: 30 },
  { value: "90d", label: "90 días", days: 90 },
  { value: "12m", label: "12 meses", days: 365 },
  { value: "custom", label: "Personalizado", days: 0 },
];
export const SEX_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
];
export const AGE_OPTIONS = ["0-17", "18-39", "40-59", "60-74", "75+"].map((v) => ({ value: v, label: `${v} años` }));
export const CHAPTER_OPTIONS = [
  { value: "II", label: "II · Neoplasias" },
  { value: "XVIII", label: "XVIII · Síntomas y signos" },
  { value: "V", label: "V · Trastornos mentales" },
  { value: "VI", label: "VI · Sistema nervioso" },
  { value: "IX", label: "IX · Sistema circulatorio" },
  { value: "X", label: "X · Sistema respiratorio" },
  { value: "XI", label: "XI · Sistema digestivo" },
  { value: "XIV", label: "XIV · Genitourinario" },
  { value: "XXI", label: "XXI · Factores de salud" },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every filter lives in the URL query, so a view can be shared or bookmarked. */
export function useEpiFilters() {
  const [params, setParams] = useSearchParams();
  const period = (params.get("period") as PeriodKey) || "30d";

  // Deep links from Inicio alerts: ?category=respiratory&date_from=…&date_to=… → the page's own keys.
  useEffect(() => {
    const category = params.get("category"), from = params.get("date_from"), to = params.get("date_to");
    if (!category && !from && !to) return;
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (category) { next.set("cat", category); next.set("catl", CATEGORY_LABELS[category] ?? category); next.delete("chapter"); }
      if (from) { next.set("period", "custom"); next.set("from", from); if (to) next.set("to", to); }
      ["category", "date_from", "date_to"].forEach((k) => next.delete(k));
      return next;
    }, { replace: true });
  }, [params, setParams]);

  const filters = useMemo<EpiQueryFilters>(() => {
    const today = new Date();
    let date_from: string | undefined;
    let date_to: string | undefined = iso(today);
    if (period === "custom" || params.get("date_from")) {
      date_from = params.get("from") || params.get("date_from") || undefined;
      date_to = params.get("to") || date_to;
    } else {
      const days = PERIODS.find((p) => p.value === period)?.days ?? 30;
      const from = new Date(today);
      from.setDate(from.getDate() - (days - 1));
      date_from = iso(from);
    }
    return {
      date_from, date_to,
      doctor_id: params.get("doctor") || undefined,
      sex: params.get("sex") || undefined,
      age_group: params.get("age") || undefined,
      chapter: params.get("chapter") || undefined,
      category: params.get("cat") || params.get("category") || undefined,
      code: params.get("code") || undefined,
    };
  }, [params, period]);

  const interval: "day" | "week" | "month" = period === "7d" ? "day" : period === "12m" ? "month" : period === "custom"
    ? ((filters.date_from && filters.date_to && (Date.parse(filters.date_to) - Date.parse(filters.date_from)) / 864e5 > 120) ? "month" : "week")
    : "week";

  const compareCodes = useMemo(() => (params.get("codes") || "").split(",").filter(Boolean), [params]);

  const set = useCallback((patch: Record<string, string | null | undefined>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  const activeCount = ["doctor", "sex", "age", "chapter", "code", "cat"].filter((k) => params.get(k)).length;

  return { params, period, filters, interval, compareCodes, set, activeCount };
}
