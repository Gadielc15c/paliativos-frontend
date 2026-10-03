import type { EpiInsightCategory, EpiInsightItem, InsightSeverity } from "../../../types/clinical";
import { casesText, fmt, fmtPct, isSmall } from "./format";

export const SEV_RANK: Record<InsightSeverity, number> = { alert: 2, watch: 1, info: 0 };

/** Backend category keys (GET /epi/categories) → Spanish label, for deep links that only carry the key. */
export const CATEGORY_LABELS: Record<string, string> = {
  palliative_care: "Cuidados paliativos", neoplasms: "Neoplasias", pain_symptoms: "Dolor y síntomas", respiratory: "Respiratorio",
  cardiovascular: "Cardiovascular", endocrine_metabolic: "Endocrino / metabólico", neurological: "Neurológico",
  mental_health: "Salud mental", infectious: "Infecciosas", other: "Otros",
};

/** Lower-case first letter for use mid-sentence ("Neumonía" → "neumonía"), unless it starts with a code-like token. */
const mid = (s: string) => (/^[A-Z]\d/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

const changePhrase = (value: number, previous: number | null, pct: number | null) => {
  if (previous === null) return casesText(value, null);
  if (isSmall(value, previous)) return casesText(value, previous);
  return `${fmt(value)} casos (${fmtPct(pct)} frente al período anterior)`;
};

/**
 * One plain-Spanish line per finding. No thresholds, means or standard deviations here:
 * those live behind "¿Cómo se calculó?".
 */
export function plainLine(i: EpiInsightItem, c: EpiInsightCategory): string {
  const code = i.codes[0];
  const what = code ? mid(code.description) : c.label.toLowerCase();
  const prev = i.metric.previous ?? null;
  switch (i.kind) {
    case "spike": return `Más casos de lo habitual de ${what}: ${casesText(i.metric.value, null)} en el período.`;
    case "new": return `Aparece ${what}: ${casesText(i.metric.value, null)} sin casos en los meses anteriores.`;
    case "increase": return `Suben los casos de ${code && i.codes.length === 1 ? what : c.label.toLowerCase()}: ${changePhrase(i.metric.value, prev, i.metric.delta_pct)}.`;
    case "decrease": return `Bajan los casos de ${code && i.codes.length === 1 ? what : c.label.toLowerCase()}: ${changePhrase(i.metric.value, prev, i.metric.delta_pct)}.`;
    case "top": default: return code ? `Lo más frecuente en ${c.label.toLowerCase()}: ${what} (${casesText(code.count, null)}).` : `${c.label}: ${casesText(i.metric.value, null)}.`;
  }
}

export type HighlightAction = { kind: "patients" | "trend" | "category"; label: string };

/** ONE action per finding: patients for a specific code, trend for a rise, filter otherwise. */
export function actionFor(i: EpiInsightItem): HighlightAction {
  if ((i.kind === "spike" || i.kind === "new") && i.codes[0]) return { kind: "patients", label: "Ver pacientes" };
  if (i.kind === "increase" && i.codes[0]) return { kind: "trend", label: "Ver tendencia" };
  return { kind: "category", label: "Filtrar categoría" };
}

/** The technical explanation (for the disclosure): backend text + baseline numbers when present. */
export function methodLines(i: EpiInsightItem): string[] {
  const m = i.metric as EpiInsightItem["metric"] & { baseline_mean?: number | null; baseline_sd?: number | null; threshold?: number | null };
  const lines = [i.explanation];
  if (m.threshold !== null && m.threshold !== undefined && !/umbral/i.test(i.explanation)) {
    lines.push(`Umbral ${m.threshold.toLocaleString("es-DO", { maximumFractionDigits: 1 })} = media ${(m.baseline_mean ?? 0).toLocaleString("es-DO", { maximumFractionDigits: 1 })} + 2 DE (${(m.baseline_sd ?? 0).toLocaleString("es-DO", { maximumFractionDigits: 2 })}).`);
  }
  return lines.filter(Boolean);
}

export const METHOD_TEXT = [
  "Comparamos cada categoría con el período anterior de la misma duración.",
  "«Más casos de lo habitual» significa que se superó la media de los 6 períodos previos más 2 desviaciones estándar.",
  "«Aparece» significa que hay al menos 3 casos y ninguno en los 6 períodos previos.",
  `Con menos de 5 casos no mostramos porcentajes: cualquier cambio parecería enorme.`,
];

/** All findings across categories, worst severity first, one per code. */
export function rankFindings(cats: EpiInsightCategory[]) {
  const seen = new Set<string>();
  return cats
    .flatMap((c) => c.insights.map((i) => ({ i, c })))
    .sort((a, b) => SEV_RANK[b.i.severity] - SEV_RANK[a.i.severity] || Number(a.i.kind === "top") - Number(b.i.kind === "top") || b.i.metric.value - a.i.metric.value)
    .filter(({ i, c }) => { const k = i.codes[0]?.code ?? c.category_key; if (seen.has(k)) return false; seen.add(k); return true; });
}
