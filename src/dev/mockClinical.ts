/**
 * Development-only fixtures for the Fase 1–3 endpoints (SOAP, CIE-10, timeline, staff,
 * /epi/*, /ai/*). Aggregations are computed from a seeded synthetic cohort, so every
 * filter on the Epidemiología screen changes the numbers the way the backend would.
 */
import { dashboardMock } from "./mockDashboard";
import type {
  AiDraftNote, AiEpiAnswer, AiEpiInsights, EpiInsightItem, AiPatientSummary, ConsultationDiagnosis, ConsultationRead,
  EpiBreakdownItem, EpiMetric, EpiPeriod, EpiTopItem, EpiTrendSeries, Icd10Code, SoapField, SoapNote, StaffRead,
  TimelineItem,
} from "../types/clinical";

const params = new URLSearchParams(location.search);
const mode = params.get("data") || "demo";
const worst = mode === "worst";
const empty = mode === "empty";

// ---------------------------------------------------------------------------
// Catalog (subset of CIE-10 used in palliative care)
// ---------------------------------------------------------------------------
const CATALOG: Array<[string, string]> = [
  ["R52.2", "Otro dolor crónico"],
  ["R52.1", "Dolor crónico intratable"],
  ["R52.9", "Dolor, no especificado"],
  ["C34.9", worst ? "Tumor maligno de los bronquios o del pulmón, parte no especificada, con extensión ganglionar mediastínica bilateral" : "Tumor maligno de los bronquios o del pulmón, parte no especificada"],
  ["C34.1", "Tumor maligno del lóbulo superior, bronquio o pulmón"],
  ["C50.9", "Tumor maligno de la mama, parte no especificada"],
  ["C18.9", "Tumor maligno del colon, parte no especificada"],
  ["C61", "Tumor maligno de la próstata"],
  ["C16.9", "Tumor maligno del estómago, parte no especificada"],
  ["C25.9", "Tumor maligno del páncreas, parte no especificada"],
  ["C22.0", "Carcinoma de células hepáticas"],
  ["C71.9", "Tumor maligno del encéfalo, parte no especificada"],
  ["R06.0", "Disnea"],
  ["R11", "Náusea y vómito"],
  ["R53", "Malestar y fatiga"],
  ["R63.0", "Anorexia"],
  ["R18", "Ascitis"],
  ["R41.0", "Desorientación, no especificada"],
  ["K59.0", "Constipación"],
  ["F41.9", "Trastorno de ansiedad, no especificado"],
  ["F32.9", "Episodio depresivo, no especificado"],
  ["G30.9", "Enfermedad de Alzheimer, no especificada"],
  ["G12.2", "Enfermedad de las neuronas motoras"],
  ["I50.9", "Insuficiencia cardíaca, no especificada"],
  ["I63.9", "Infarto cerebral, no especificado"],
  ["J44.9", "Enfermedad pulmonar obstructiva crónica, no especificada"],
  ["J18.9", "Neumonía, no especificada"],
  ["N18.5", "Enfermedad renal crónica, etapa 5"],
  ["E43", "Desnutrición proteicocalórica severa, no especificada"],
  ["L89.9", "Úlcera por presión, no especificada"],
  ["B20", "Enfermedad por virus de la inmunodeficiencia humana [VIH]"],
  ["Z51.5", "Atención paliativa"],
];
const describe = (code: string) => CATALOG.find(([c]) => c === code)?.[1] ?? code;
const CHAPTERS: Array<[RegExp, string, string]> = [
  [/^[AB]/, "I", "I (A00-B99) Ciertas enfermedades infecciosas y parasitarias"],
  [/^(C|D[0-4])/, "II", "II (C00-D49) Neoplasias"],
  [/^E/, "IV", "IV (E00-E89) Enfermedades endocrinas, nutricionales y metabólicas"],
  [/^F/, "V", "V (F01-F99) Trastornos mentales y del comportamiento"],
  [/^G/, "VI", "VI (G00-G99) Enfermedades del sistema nervioso"],
  [/^I/, "IX", "IX (I00-I99) Enfermedades del sistema circulatorio"],
  [/^J/, "X", "X (J00-J99) Enfermedades del sistema respiratorio"],
  [/^K/, "XI", "XI (K00-K95) Enfermedades del sistema digestivo"],
  [/^L/, "XII", "XII (L00-L99) Enfermedades de la piel"],
  [/^N/, "XIV", "XIV (N00-N99) Enfermedades del sistema genitourinario"],
  [/^R/, "XVIII", "XVIII (R00-R99) Síntomas, signos y hallazgos anormales"],
  [/^Z/, "XXI", "XXI (Z00-Z99) Factores que influyen en el estado de salud"],
];
const chapterOf = (code: string) => CHAPTERS.find(([re]) => re.test(code)) ?? CHAPTERS[CHAPTERS.length - 1];
export const icdCatalog: Icd10Code[] = CATALOG.map(([code, description_es], i) => ({
  code, description_es, chapter: chapterOf(code)[1], is_billable: code.includes(".") || code.length === 3,
  is_favorite: i < 6, use_count: Math.max(0, 40 - i * 2),
}));

// ---------------------------------------------------------------------------
// Seeded synthetic cohort
// ---------------------------------------------------------------------------
let seed = 20261003;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

const longDoctor = "Dra. María de los Ángeles Fernández de Córdoba y Santísima Trinidad";
export const epiDoctors = [
  { id: "doctor-1", name: worst ? longDoctor : "Dra. Lucía Mendoza" },
  { id: "doctor-2", name: "Dr. Andrés Medina" },
  { id: "doctor-3", name: "Dra. Paula Castillo" },
];
const FIRST = ["María", "Elena", "Carmen", "Rosa", "Ana", "José", "Carlos", "Luis", "Juan", "Pedro", "Teresa", "Julia", "Manuel", "Ramón", "Isabel", "Francisco"];
const LAST = ["Pérez", "Rodríguez", "Gómez", "Martínez", "Sánchez", "Díaz", "Núñez", "Reyes", "Castillo", "Herrera", "Vargas", "Jiménez"];
const AGE_GROUPS = ["0-17", "18-39", "40-59", "60-74", "75+"] as const;
const ageGroupOf = (age: number | null) => age === null ? "unknown" : age < 18 ? "0-17" : age < 40 ? "18-39" : age < 60 ? "40-59" : age < 75 ? "60-74" : "75+";

interface EpiPatient { id: string; name: string; sex: "female" | "male"; age: number; doctor: string }
const cohort: EpiPatient[] = Array.from({ length: 40 }, (_, i) => {
  const sex = rand() < 0.56 ? "female" : "male";
  const age = Math.round(26 + rand() * 66);
  return {
    id: i < 4 ? `patient-${i + 1}` : `epi-patient-${i + 1}`,
    name: i === 0 && worst ? "María de los Ángeles Fernanda de la Santísima Trinidad Fernández de Córdoba" : `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
    sex, age, doctor: epiDoctors[i % 3].id,
  };
});
const WEIGHTED = [
  ["R52.2", 18], ["C34.9", 10], ["R06.0", 9], ["C50.9", 7], ["Z51.5", 7], ["R53", 6], ["C18.9", 5], ["R11", 5], ["F41.9", 5],
  ["K59.0", 4], ["C61", 4], ["R63.0", 4], ["I50.9", 3], ["J44.9", 3], ["C25.9", 3], ["G30.9", 2], ["N18.5", 2], ["E43", 2],
  ["C16.9", 2], ["L89.9", 2], ["F32.9", 2], ["R18", 1], ["C22.0", 1], ["J18.9", 1],
] as const;
const totalWeight = WEIGHTED.reduce((a, [, w]) => a + w, 0);
const weightedCode = () => { let r = rand() * totalWeight; for (const [c, w] of WEIGHTED) { r -= w; if (r <= 0) return c; } return "R52.2"; };

const DAY = 86400000;
const startOfToday = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
interface EpiRecord { id: string; date: string; patient: EpiPatient; codes: string[]; signed: boolean }
const records: EpiRecord[] = empty ? [] : (() => {
  const out: EpiRecord[] = [];
  const today = startOfToday();
  for (let i = 0; i < 420; i++) {
    const back = Math.floor(Math.pow(rand(), 1.15) * 400);
    const n = 1 + Math.floor(rand() * 2.4);
    const codes = new Set<string>();
    while (codes.size < n) codes.add(weightedCode());
    out.push({ id: `epi-c-${i}`, date: iso(today - back * DAY), patient: pick(cohort), codes: [...codes], signed: rand() > 0.08 });
  }
  // A recent pneumonia cluster so insights have a spike to explain.
  for (let i = 0; i < 9; i++) out.push({ id: `epi-j-${i}`, date: iso(today - Math.floor(rand() * 25) * DAY), patient: pick(cohort), codes: ["J18.9", "R06.0"], signed: true });
  return out;
})();

// ---------------------------------------------------------------------------
// Aggregations (mirror the backend contract)
// ---------------------------------------------------------------------------
type Q = Record<string, string | undefined>;
const list = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
function period(q: Q, defaultDays = 365): EpiPeriod {
  const to = q.date_to ? Date.parse(q.date_to) : startOfToday();
  const from = q.date_from ? Date.parse(q.date_from) : to - (defaultDays - 1) * DAY;
  return { date_from: iso(from), date_to: iso(to), days: Math.round((to - from) / DAY) + 1 };
}
const previous = (p: EpiPeriod): EpiPeriod => {
  const to = Date.parse(p.date_from) - DAY;
  return { date_from: iso(to - (p.days - 1) * DAY), date_to: iso(to), days: p.days };
};
interface Row { rec: EpiRecord; code: string; primary: boolean }
/** Chapter filter: roman ("II") or range ("C00-D49"), like the backend. */
function inChapter(code: string, chapter: string) {
  const m = chapter.toUpperCase().match(/^([A-Z]\d{2})-([A-Z]\d{2})$/);
  if (!m) return chapterOf(code)[1] === chapter.toUpperCase();
  const k = code.toUpperCase().slice(0, 3);
  return k >= m[1] && k <= m[2];
}
function rows(q: Q, p: EpiPeriod, ignoreCode = false): Row[] {
  const sex = list(q.sex), ages = list(q.age_group);
  const out: Row[] = [];
  for (const rec of records) {
    if (rec.date < p.date_from || rec.date > p.date_to) continue;
    if (q.doctor_id && rec.patient.doctor !== q.doctor_id) continue;
    if (sex.length && !sex.includes(rec.patient.sex)) continue;
    if (ages.length && !ages.includes(ageGroupOf(rec.patient.age))) continue;
    rec.codes.forEach((code, i) => {
      if (q.primary_only === "true" && i > 0) return;
      if (q.chapter && !inChapter(code, q.chapter)) return;
      if (q.category && categoryOf(code).key !== q.category) return;
      if (!ignoreCode && q.code && !code.replace(".", "").toUpperCase().startsWith(q.code.replace(".", "").toUpperCase())) return;
      out.push({ rec, code, primary: i === 0 });
    });
  }
  return out;
}
const metric = (value: number, prev: number): EpiMetric => ({ value, previous: prev, delta: value - prev, delta_pct: prev ? Math.round(((value - prev) / prev) * 1000) / 10 : null });
const uniq = (rs: Row[], key: (r: Row) => string) => new Set(rs.map(key)).size;

function filtersEcho(q: Q) {
  return { doctor_id: q.doctor_id ?? null, sex: list(q.sex), age_group: list(q.age_group), age_min: null, age_max: null, chapter: q.chapter ?? null, code: q.code ?? null, primary_only: q.primary_only === "true" };
}

function summary(q: Q) {
  const p = period(q), pp = previous(p);
  const cur = rows(q, p), prev = rows(q, pp);
  const inPeriod = records.filter((r) => r.date >= p.date_from && r.date <= p.date_to && (!q.doctor_id || r.patient.doctor === q.doctor_id));
  return {
    period: p, previous_period: pp, filters: filtersEcho(q),
    consultations: metric(uniq(cur, (r) => r.rec.id), uniq(prev, (r) => r.rec.id)),
    patients: metric(uniq(cur, (r) => r.rec.patient.id), uniq(prev, (r) => r.rec.patient.id)),
    diagnoses: metric(cur.length, prev.length),
    distinct_codes: metric(uniq(cur, (r) => r.code), uniq(prev, (r) => r.code)),
    data_quality: { consultations_total: inPeriod.length + 3, consultations_without_diagnosis: inPeriod.length ? 3 : 0, consultations_unsigned: inPeriod.filter((r) => !r.signed).length },
  };
}

function top(q: Q, limit = 10, level: "code" | "category" = "code") {
  const p = period(q), pp = previous(p);
  const keyOf = (c: string) => (level === "category" ? c.slice(0, 3) : c);
  const cur = rows(q, p), prev = rows(q, pp);
  const groups = new Map<string, Row[]>();
  cur.forEach((r) => groups.set(keyOf(r.code), [...(groups.get(keyOf(r.code)) ?? []), r]));
  const items: EpiTopItem[] = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code, rs], i) => {
      const prevCount = prev.filter((r) => keyOf(r.code) === code).length;
      return {
        rank: i + 1, code, description: level === "category" ? describe(CATALOG.find(([c]) => c.startsWith(code))?.[0] ?? code) : describe(code),
        count: rs.length, patients: uniq(rs, (r) => r.rec.patient.id), share_pct: Math.round((rs.length / Math.max(1, cur.length)) * 1000) / 10,
        previous_count: prevCount, delta: rs.length - prevCount, delta_pct: prevCount ? Math.round(((rs.length - prevCount) / prevCount) * 1000) / 10 : null,
      };
    });
  return { period: p, previous_period: pp, filters: filtersEcho(q), level, total_diagnoses: cur.length, items };
}

const mondayOf = (d: string) => { const t = Date.parse(d); const wd = (new Date(t).getUTCDay() + 6) % 7; return iso(t - wd * DAY); };
function trend(q: Q) {
  const p = period(q);
  const interval = (q.interval as "day" | "week" | "month") || "month";
  const bucketOf = (d: string) => (interval === "day" ? d : interval === "week" ? mondayOf(d) : d.slice(0, 7));
  const buckets: string[] = [];
  for (let t = Date.parse(p.date_from); t <= Date.parse(p.date_to); t += DAY) { const b = bucketOf(iso(t)); if (buckets[buckets.length - 1] !== b) buckets.push(b); }
  const codes = list(q.codes).slice(0, 8);
  const metricName = (q.metric as "diagnoses" | "consultations" | "patients") || "diagnoses";
  const count = (rs: Row[]) => metricName === "diagnoses" ? rs.length : metricName === "consultations" ? uniq(rs, (r) => r.rec.id) : uniq(rs, (r) => r.rec.patient.id);
  const make = (key: string, label: string, rs: Row[]): EpiTrendSeries => {
    const points = buckets.map((b) => ({ bucket: b, value: count(rs.filter((r) => bucketOf(r.rec.date) === b)) }));
    return { key, label, total: points.reduce((a, x) => a + x.value, 0), points };
  };
  const base = rows(q, p);
  const series = codes.length
    ? codes.map((c) => make(c, `${c} ${describe(CATALOG.find(([k]) => k.startsWith(c))?.[0] ?? c)}`, base.filter((r) => r.code.replace(".", "").startsWith(c.replace(".", "")))))
    : [make("total", "Total", base)];
  return { period: p, filters: filtersEcho(q), interval, metric: metricName, buckets, series };
}

const SEX_LABEL: Record<string, string> = { female: "Femenino", male: "Masculino", other: "Otro", unknown: "Sin dato" };
function breakdown(q: Q) {
  const p = period(q);
  const by = q.by || "sex";
  const cur = rows(q, p);
  const keyOf = (r: Row): [string, string, Partial<EpiBreakdownItem>] => {
    const ag = ageGroupOf(r.rec.patient.age);
    switch (by) {
      case "age_group": return [ag, `${ag} años`, { age_group: ag }];
      case "age_sex": return [`${ag}|${r.rec.patient.sex}`, `${ag} años · ${SEX_LABEL[r.rec.patient.sex]}`, { age_group: ag, sex: r.rec.patient.sex }];
      case "doctor": { const d = epiDoctors.find((x) => x.id === r.rec.patient.doctor)!; return [d.id, d.name, {}]; }
      case "chapter": { const c = chapterOf(r.code); return [c[1], c[2], {}]; }
      default: return [r.rec.patient.sex, SEX_LABEL[r.rec.patient.sex], { sex: r.rec.patient.sex }];
    }
  };
  const groups = new Map<string, { label: string; extra: Partial<EpiBreakdownItem>; rs: Row[] }>();
  cur.forEach((r) => { const [k, label, extra] = keyOf(r); const g = groups.get(k) ?? { label, extra, rs: [] }; g.rs.push(r); groups.set(k, g); });
  const order = (k: string) => by === "age_group" || by === "age_sex" ? AGE_GROUPS.indexOf(k.split("|")[0] as (typeof AGE_GROUPS)[number]) : 0;
  const items: EpiBreakdownItem[] = [...groups.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]) || b[1].rs.length - a[1].rs.length)
    .map(([key, g]) => ({ key, label: g.label, ...g.extra, diagnoses: g.rs.length, consultations: uniq(g.rs, (r) => r.rec.id), patients: uniq(g.rs, (r) => r.rec.patient.id), share_pct: Math.round((g.rs.length / Math.max(1, cur.length)) * 1000) / 10 }));
  return { period: p, filters: filtersEcho(q), by, total_diagnoses: cur.length, items };
}

function patientsByDiagnosis(q: Q) {
  const p = period(q);
  const cur = rows(q, p);
  const byPatient = new Map<string, Row[]>();
  cur.forEach((r) => byPatient.set(r.rec.patient.id, [...(byPatient.get(r.rec.patient.id) ?? []), r]));
  const items = [...byPatient.values()].map((rs) => {
    const pt = rs[0].rec.patient;
    const dates = rs.map((r) => r.rec.date).sort();
    return {
      patient_id: pt.id, full_name: pt.name, sex: pt.sex, age: pt.age, age_group: ageGroupOf(pt.age),
      doctor_id: pt.doctor, doctor_name: epiDoctors.find((d) => d.id === pt.doctor)!.name, diagnoses: rs.length,
      codes: [...new Set(rs.map((r) => r.code))], first_date: `${dates[0]}T15:00:00Z`, last_date: `${dates[dates.length - 1]}T15:00:00Z`,
      last_consultation_id: "consultation-1",
    };
  }).sort((a, b) => b.last_date.localeCompare(a.last_date));
  const size = Number(q.page_size || 25);
  return { period: p, filters: filtersEcho(q), items: items.slice(0, size), page: 1, page_size: size, total: items.length, total_pages: Math.max(1, Math.ceil(items.length / size)) };
}

// ---------------------------------------------------------------------------
// AI (deterministic, mirrors the backend's offline provider)
// ---------------------------------------------------------------------------
const DISCLAIMER = "Contenido generado por IA a partir de datos del sistema. Es un borrador de apoyo: debe ser revisado y validado por el médico antes de usarse.";
let suggestionSeq = 1;
const suggestionTarget = new Map<string, string>();
const envelope = () => ({ suggestion_id: `sugg-${suggestionSeq++}`, provider: "offline", model: "rules-v1", fallback: false, disclaimer: true, disclaimer_text: DISCLAIMER });

/** Disease categories used by the insights contract (backend groups ICD-10 codes the same way). */
const CATEGORIES: Array<{ key: string; label: string; chapter: string | null; range: string | null; match: (c: string) => boolean }> = [
  { key: "palliative_care", label: "Cuidados paliativos / atención", chapter: "XXI", range: "Z51.5", match: (c) => c.startsWith("Z51.5") },
  { key: "neoplasms", label: "Neoplasias", chapter: "II", range: "C00-D49", match: (c) => /^(C|D[0-4])/.test(c) },
  { key: "pain_symptoms", label: "Dolor y síntomas", chapter: "XVIII", range: "R50-R69", match: (c) => /^R(5\d|6\d)/.test(c) },
  { key: "respiratory", label: "Respiratorio", chapter: "X", range: "J00-J99", match: (c) => c.startsWith("J") },
  { key: "cardiovascular", label: "Cardiovascular", chapter: "IX", range: "I00-I99", match: (c) => c.startsWith("I") },
  { key: "endocrine_metabolic", label: "Endocrino / metabólico", chapter: "IV", range: "E00-E90", match: (c) => c.startsWith("E") },
  { key: "neurological", label: "Neurológico", chapter: "VI", range: "G00-G99", match: (c) => c.startsWith("G") },
  { key: "mental_health", label: "Salud mental", chapter: "V", range: "F00-F99", match: (c) => c.startsWith("F") },
  { key: "infectious", label: "Infecciosas", chapter: "I", range: "A00-B99", match: (c) => /^[AB]/.test(c) },
  { key: "other", label: "Otros", chapter: null, range: null, match: () => true },
];
const categoryOf = (code: string) => CATEGORIES.find((c) => c.match(code))!;
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
const SEV = { info: 0, watch: 1, alert: 2 };
const sevRank = (c: { insights: EpiInsightItem[] }) => Math.max(-1, ...c.insights.map((i) => SEV[i.severity]));

function insightCategories(q: Q, p: EpiPeriod) {
  const base = { ...q, chapter: undefined, code: undefined };
  const cur = rows(base, p), prev = rows(base, previous(p));
  // Sparkline: 12 weekly buckets ending on the period's last day.
  const end = Date.parse(p.date_to);
  const weeks = Array.from({ length: 12 }, (_, i) => { const to = end - (11 - i) * 7 * DAY; return { from: iso(to - 6 * DAY), to: iso(to) }; });
  const spark = rows(base, { date_from: weeks[0].from, date_to: p.date_to, days: 84 });
  return CATEGORIES.map((cat) => {
    const c = cur.filter((r) => categoryOf(r.code) === cat), pv = prev.filter((r) => categoryOf(r.code) === cat);
    const byCode = (rs: Row[]) => { const m = new Map<string, number>(); rs.forEach((r) => m.set(r.code, (m.get(r.code) ?? 0) + 1)); return m; };
    const cc = byCode(c), pc = byCode(pv);
    const codesSorted = [...cc.entries()].sort((x, y) => y[1] - x[1]);
    const codeRef = (code: string) => ({ code, description: describe(code), count: cc.get(code) ?? 0 });
    const items: EpiInsightItem[] = [];
    const id = (k: string) => `${cat.key}-${k}`;
    const catDelta = pct(c.length, pv.length);
    const hist = Array.from({ length: 6 }, (_, k) => { const to = Date.parse(p.date_from) - DAY - k * p.days * DAY; return rows(base, { date_from: iso(to - (p.days - 1) * DAY), date_to: iso(to), days: p.days }).filter((r) => categoryOf(r.code) === cat).length; });
    const mean = hist.reduce((x, y) => x + y, 0) / 6;
    const sd = Math.sqrt(hist.reduce((x, y) => x + (y - mean) ** 2, 0) / 6);
    const thr = mean + 2 * sd;
    if (c.length >= 4 && c.length > thr && sd > 0) {
      items.push({ id: id("spike"), kind: "spike", severity: "alert", title: "Pico inusual", metric: { value: c.length, previous: pv.length, delta_pct: catDelta, unit: "casos" },
        codes: codesSorted.slice(0, 3).map(([k]) => codeRef(k)), explanation: `Por encima del umbral ${thr.toFixed(1)} (media ${mean.toFixed(1)} + 2 DE ${sd.toFixed(1)} de los 6 períodos previos).`,
        evidence_query: { endpoint: "/epi/trend", params: { chapter: cat.range, interval: "week" } } });
    }
    const rising = codesSorted.map(([k, n]) => ({ k, n, prev: pc.get(k) ?? 0 })).filter((x) => x.n >= 3 && x.n > x.prev).sort((x, y) => (y.n - y.prev) - (x.n - x.prev))[0];
    if (rising) {
      const d = pct(rising.n, rising.prev);
      items.push({ id: id(`inc-${rising.k}`), kind: rising.prev === 0 ? "new" : "increase", severity: d === null || d >= 100 ? "watch" : "info",
        title: rising.prev === 0 ? `Nuevo: ${describe(rising.k)}` : `Aumento de ${describe(rising.k)}`, metric: { value: rising.n, previous: rising.prev, delta_pct: d, unit: "casos" },
        codes: [codeRef(rising.k)], explanation: rising.prev === 0 ? "Sin casos en el período anterior." : `${rising.n} frente a ${rising.prev} en el período anterior.` });
    }
    const falling = [...pc.entries()].map(([k, n]) => ({ k, prev: n, n: cc.get(k) ?? 0 })).filter((x) => x.prev >= 3 && x.n < x.prev * 0.7).sort((x, y) => (x.n - x.prev) - (y.n - y.prev))[0];
    if (falling && items.length < 3) {
      items.push({ id: id(`dec-${falling.k}`), kind: "decrease", severity: "info", title: `Descenso de ${describe(falling.k)}`, metric: { value: falling.n, previous: falling.prev, delta_pct: pct(falling.n, falling.prev), unit: "casos" },
        codes: [{ code: falling.k, description: describe(falling.k), count: falling.n }], explanation: `${falling.n} frente a ${falling.prev} en el período anterior.` });
    }
    if (codesSorted.length && items.length < 3 && !items.some((i) => i.codes[0]?.code === codesSorted[0][0])) {
      const [k, n] = codesSorted[0];
      items.push({ id: id("top"), kind: "top", severity: "info", title: "Más frecuente", metric: { value: n, previous: pc.get(k) ?? 0, delta_pct: pct(n, pc.get(k) ?? 0), unit: "casos" },
        codes: codesSorted.slice(0, 3).map(([x]) => codeRef(x)), explanation: `${Math.round((n / Math.max(1, c.length)) * 100)}% de los casos de la categoría.` });
    }
    return {
      category_key: cat.key, label: cat.label, icd_chapter: cat.chapter, icd_range: cat.range, total_cases: c.length, previous_cases: pv.length, delta_pct: catDelta,
      trend: weeks.map((w) => ({ bucket: w.to, count: spark.filter((r) => categoryOf(r.code) === cat && r.rec.date >= w.from && r.rec.date <= w.to).length })),
      insights: items.slice(0, 3),
    };
  }).filter((c) => c.total_cases > 0 || c.insights.length > 0)
    .sort((x, y) => sevRank(y) - sevRank(x) || y.total_cases - x.total_cases);
}

function insights(q: Q): AiEpiInsights {
  const p = period(q, 30);
  return { suggestion_id: `sugg-${suggestionSeq++}`, period: p, categories: insightCategories(q, p), generated_by: "template", model: "rules-v1", disclaimer: DISCLAIMER };
}

function ask(question: string): AiEpiAnswer {
  const qn = question.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const days = /semana/.test(qn) ? 7 : /mes/.test(qn) ? 30 : /trimestre|3 meses/.test(qn) ? 90 : 365;
  const p = period({}, days);
  const q: Q = { date_from: p.date_from, date_to: p.date_to };
  if (/mujer|femenin/.test(qn)) q.sex = "female";
  if (/hombre|masculin|varon/.test(qn)) q.sex = "male";
  const limit = Number(qn.match(/\b(\d{1,2})\b/)?.[1] ?? 5);
  const env = envelope();
  if (/aument|hallazgo|categor|novedad|alerta|cambi/.test(qn)) {
    const cats = insightCategories(q, p).filter((c) => c.insights.length);
    const flagged = cats.filter((c) => c.insights.some((i) => i.severity !== "info"));
    return { ...env, question, intent: "insights", intent_source: "model", params: q, period: p, categories: cats.slice(0, 4),
      data: cats.flatMap((c) => c.insights.map((i) => ({ category: c.label, title: i.title, value: i.metric.value, previous: i.metric.previous, delta_pct: i.metric.delta_pct, codes: i.codes.map((x) => x.code) }))),
      chart_hint: { type: "bar" },
      answer: flagged.length ? `${flagged.length} ${flagged.length === 1 ? "categoría muestra" : "categorías muestran"} cambios a vigilar: ${flagged.map((c) => c.label).join(", ")}.` : "Sin cambios relevantes frente al período anterior." };
  }
  if (/tendencia|evolucion|por mes|mensual|semanal/.test(qn)) {
    const codes = /dolor/.test(qn) ? "R52" : /neumon/.test(qn) ? "J18" : /cancer|tumor|neoplas/.test(qn) ? "C34,C50,C18" : "";
    const tr = trend({ ...q, interval: days <= 31 ? "week" : "month", codes });
    const data = tr.series.flatMap((s) => s.points.map((pt) => ({ series: s.key, label: s.label, bucket: pt.bucket, value: pt.value })));
    const main = tr.series[0];
    return { ...env, question, intent: "trend", intent_source: "model", params: { ...q, interval: tr.interval, codes: codes || undefined }, data, chart_hint: { type: "line", x: "bucket", y: "value", label: "series" }, period: p,
      answer: `Evolución de ${main.label === "Total" ? "los diagnósticos" : main.label} del ${p.date_from} al ${p.date_to}: ${main.total} registros en total, con el máximo en ${main.points.reduce((a, b) => (b.value > a.value ? b : a)).bucket}.` };
  }
  if (/edad|sexo|genero|piramide|medico|doctor|capitulo/.test(qn)) {
    const by = /piramide/.test(qn) ? "age_sex" : /edad/.test(qn) ? "age_group" : /medico|doctor/.test(qn) ? "doctor" : /capitulo/.test(qn) ? "chapter" : "sex";
    const b = breakdown({ ...q, by });
    return { ...env, question, intent: "breakdown", intent_source: "model", params: { ...q, by }, data: b.items as unknown as Array<Record<string, unknown>>, chart_hint: { type: by === "age_sex" ? "pyramid" : by === "sex" ? "pie" : "bar", orientation: "horizontal", x: "diagnoses", y: "label" }, period: p,
      answer: b.items.length ? `Distribución por ${by === "age_group" ? "grupo de edad" : by === "doctor" ? "médico" : by === "chapter" ? "capítulo CIE-10" : "sexo"} del ${p.date_from} al ${p.date_to}: ${b.items.slice(0, 3).map((i) => `${i.label} ${i.share_pct}%`).join(", ")}.` : "No hay diagnósticos en ese período con esos filtros." };
  }
  if (/cuant|total|resumen/.test(qn) && !/diagnosticos mas/.test(qn)) {
    const s = summary(q);
    const data = (["consultations", "patients", "diagnoses"] as const).map((k) => ({ metric: k, label: k === "consultations" ? "Consultas" : k === "patients" ? "Pacientes" : "Diagnósticos", ...s[k] }));
    return { ...env, question, intent: "summary", intent_source: "model", params: q, data, chart_hint: { type: "kpi" }, period: p,
      answer: `Del ${p.date_from} al ${p.date_to} hubo ${s.consultations.value} consultas de ${s.patients.value} pacientes, con ${s.diagnoses.value} diagnósticos codificados (${s.diagnoses.delta >= 0 ? "+" : ""}${s.diagnoses.delta} frente al período anterior).` };
  }
  const t = top(q, Math.min(10, Math.max(3, limit)));
  return { ...env, question, intent: "top_diagnoses", intent_source: "model", params: { ...q, limit: t.items.length, level: "code" }, data: t.items as unknown as Array<Record<string, unknown>>, chart_hint: { type: "bar", orientation: "horizontal", x: "count", y: "description", label: "code" }, period: p,
    answer: t.items.length ? `Diagnósticos más frecuentes del ${p.date_from} al ${p.date_to}${q.sex === "female" ? " en mujeres" : q.sex === "male" ? " en hombres" : ""}: ${t.items.slice(0, 5).map((i) => `${i.rank}) ${i.code} ${i.description}: ${i.count} (${i.share_pct}% del total)`).join("; ")}.` : "No hay diagnósticos en ese período con esos filtros." };
}

const KEYWORDS: Array<[RegExp, string, string]> = [
  [/dolor/, "R52.2", "dolor"], [/disnea|falta de aire|ahogo/, "R06.0", "disnea"], [/nause|vomit/, "R11", "náuseas"],
  [/estren|constipa/, "K59.0", "estreñimiento"], [/ansiedad|ansios/, "F41.9", "ansiedad"], [/fatiga|astenia|cansancio/, "R53", "fatiga"],
  [/anorexia|inapetencia|no come/, "R63.0", "anorexia"], [/ascitis/, "R18", "ascitis"], [/pulmon|bronq/, "C34.9", "cáncer de pulmón"],
  [/mama/, "C50.9", "cáncer de mama"], [/neumon/, "J18.9", "neumonía"], [/ulcera/, "L89.9", "úlcera por presión"],
];
function draftNote(consultationId: string, text: string): AiDraftNote {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const soap: SoapNote = { chief_complaint: null, history_present_illness: null, past_history: null, physical_exam: null, assessment: null, plan: null };
  const add = (f: SoapField, s: string) => { soap[f] = soap[f] ? `${soap[f]} ${s}` : s; };
  for (const s of sentences) {
    const n = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/\b(ta|fc|fr|sato2|spo2|temp|examen|ausculta|abdomen|lucido|orientad|mucosas)\b/.test(n)) add("physical_exam", s);
    else if (/se indica|plan|iniciar|aumentar|control en|continuar|suspender|rotar|ajustar/.test(n)) add("plan", s);
    else if (/antecedente|historia de|conocid|diagnosticad|operad/.test(n)) add("past_history", s);
    else if (/impresion|probable|compatible|sugestivo|se interpreta|evaluacion/.test(n)) add("assessment", s);
    else if (!soap.chief_complaint && /acude|consulta por|motivo|refiere/.test(n)) add("chief_complaint", s);
    else add(soap.chief_complaint ? "history_present_illness" : "chief_complaint", s);
  }
  const lower = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const icd = KEYWORDS.filter(([re]) => {
    const m = lower.match(re);
    if (!m) return false;
    const before = lower.slice(Math.max(0, (m.index ?? 0) - 18), m.index);
    return !/niega|sin |no presenta|no refiere/.test(before);
  }).slice(0, 5).map(([re, code, term]) => {
    const evidence = sentences.find((s) => re.test(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))) ?? null;
    return { code, description: describe(code), rationale: `La nota menciona «${term}».`, evidence, evidence_verified: !!evidence, source: "model" as const };
  });
  const env = envelope();
  suggestionTarget.set(env.suggestion_id, consultationId);
  return { ...env, consultation_id: consultationId, status: "pending", soap, icd10_suggestions: icd, deidentified: /\b[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+\b/.test(text) ? { NOMBRE: 1 } : {} };
}

// ---------------------------------------------------------------------------
// Consultations (in memory, version-checked like the backend)
// ---------------------------------------------------------------------------
const now = () => new Date().toISOString();
const consultations = new Map<string, ConsultationRead>();
const diagnoses = new Map<string, ConsultationDiagnosis[]>();
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const blank: SoapNote = { chief_complaint: null, history_present_illness: null, past_history: null, physical_exam: null, assessment: null, plan: null };
function seedConsultation(id: string, patientId: string, when: string, status: ConsultationRead["status"], soap: Partial<SoapNote>, codes: string[]) {
  consultations.set(id, {
    id, patient_id: patientId, doctor_id: "doctor-1", consultation_date: when, reason: soap.chief_complaint ?? "", notes: null, ...blank, ...soap,
    status, version: status === "draft" ? 1 : 3, signed_by: status === "draft" ? null : "preview-user", signed_at: status === "draft" ? null : when,
    amendments: status === "amended" ? [{ id: "amend-1", content: "Se agrega: alergia a AINEs referida por la familia.", reason: "Omisión", author_user_id: "preview-user", created_at: when }] : [],
    created_by_user_id: "preview-user", created_at: when, updated_at: when,
  });
  diagnoses.set(id, codes.map((code, i) => ({ id: `${id}-dx-${i}`, consultation_id: id, code, description: describe(code), system: "ICD-10", is_primary: i === 0, created_at: when })));
}
if (!empty) {
  for (let i = 1; i <= 6; i++) {
    const pid = `patient-${i}`;
    const k = (i - 1) * 3;
    seedConsultation(i === 1 ? "consultation-1" : `consultation-${k + 1}`, pid, daysAgo(0), "draft", { chief_complaint: worst ? "Control de síntomas: dolor oncológico de difícil manejo con irradiación lumbar, disnea de esfuerzo y deterioro del estado general" : "Control de dolor oncológico" }, []);
    seedConsultation(`consultation-${k + 2}`, pid, daysAgo(10), "signed", { chief_complaint: "Dolor abdominal persistente", history_present_illness: "Dolor 7/10 de 2 semanas, peor de noche.", assessment: "Dolor oncológico mal controlado.", plan: "Morfina oral 5 mg c/4h. Control en 7 días." }, ["C34.9", "R52.2"]);
    seedConsultation(`consultation-${k + 3}`, pid, daysAgo(41), "amended", { chief_complaint: "Primera valoración por cuidados paliativos", assessment: "Cáncer de pulmón estadio IV con disnea de esfuerzo.", plan: "Oxigenoterapia domiciliaria y seguimiento semanal." }, ["C34.9", "R06.0", "Z51.5"]);
  }
}
const consultationsFor = (pid: string) => [...consultations.values()].filter((c) => c.patient_id === pid).sort((a, b) => b.consultation_date.localeCompare(a.consultation_date));
const conflict = (message: string) => Object.assign(new Error(message), { status: 409 });

function patchConsultation(id: string, body: Record<string, unknown>) {
  const c = consultations.get(id);
  if (!c) throw new Error("404");
  if (c.status !== "draft") throw conflict("La nota ya está firmada.");
  if (body.version !== undefined && body.version !== c.version) throw conflict("Consultation version mismatch");
  const { version: _v, ...fields } = body;
  const next = { ...c, ...fields, version: c.version + 1, updated_at: now() } as ConsultationRead;
  consultations.set(id, next);
  return next;
}

// ---------------------------------------------------------------------------
// Staff, timeline, patient summary
// ---------------------------------------------------------------------------
const staff: StaffRead[] = empty ? [] : [
  ...epiDoctors.map((d, i) => ({ id: `user-doc-${i + 1}`, type: "doctor" as const, role: (i === 0 ? "admin" : "doctor") as "admin" | "doctor", profile_id: d.id, doctor_id: d.id, first_name: d.name.split(" ")[1], last_name: d.name.split(" ").slice(2).join(" "), full_name: d.name, email: worst && i === 0 ? "maria.fernandez.coordinacion-paliativa@unidad-de-atencion-integral.example.com" : `${d.name.split(" ")[1].toLowerCase()}@clinica.example.com`, phone: "809-555-010" + i, specialty: "Medicina paliativa", license_number: `EXQ-${120 + i}`, notes: null, is_active: true, created_at: daysAgo(200), updated_at: daysAgo(3) })),
  { id: "user-sec-1", type: "secretary", role: "secretary", profile_id: "secretary-1", doctor_id: "doctor-1", first_name: "María", last_name: "Fernández", full_name: "María Fernández", email: "maria.fernandez@clinica.example.com", phone: "809-555-0199", specialty: null, license_number: null, notes: null, is_active: true, created_at: daysAgo(120), updated_at: daysAgo(30) },
  { id: "user-sec-2", type: "secretary", role: "secretary", profile_id: "secretary-2", doctor_id: "doctor-2", first_name: "Rosa", last_name: "Núñez", full_name: "Rosa Núñez", email: "rosa.nunez@clinica.example.com", phone: null, specialty: null, license_number: null, notes: null, is_active: false, created_at: daysAgo(300), updated_at: daysAgo(60) },
  { id: "user-doc-4", type: "doctor", role: "doctor", profile_id: "doctor-4", doctor_id: "doctor-4", first_name: "Ramón", last_name: "Vargas", full_name: "Dr. Ramón Vargas", email: "ramon.vargas@clinica.example.com", phone: null, specialty: "Medicina familiar", license_number: "MED-1990", notes: null, is_active: false, created_at: "2025-02-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" },
];

function timeline(pid: string) {
  const items: TimelineItem[] = [];
  for (const c of consultationsFor(pid)) {
    items.push({ id: c.id, type: "consultation", occurred_at: c.consultation_date, doctor_id: c.doctor_id, doctor_name: epiDoctors[0].name,
      consultation: { status: c.status, signed_at: c.signed_at, amendment_count: c.amendments.length, reason: c.reason, chief_complaint: c.chief_complaint, assessment: c.assessment, plan: c.plan, diagnoses: (diagnoses.get(c.id) ?? []).map(({ code, description, is_primary }) => ({ code, description, is_primary })) } });
  }
  if (items.length) {
    items.push({ id: `${pid}-rx-1`, type: "prescription", occurred_at: daysAgo(10), doctor_name: epiDoctors[0].name, prescription: { medication: "Morfina oral", dosage: "5 mg c/4h", instructions: "Rescates de 2,5 mg si dolor irruptivo.", status: "active", start_date: daysAgo(10).slice(0, 10), end_date: null } });
    items.push({ id: `${pid}-doc-1`, type: "document", occurred_at: daysAgo(12), doctor_name: epiDoctors[0].name, document: { title: worst ? "Informe de tomografía computarizada de tórax con contraste y reconstrucciones multiplanares" : "TAC de tórax", file_name: "tac-torax.pdf", mime_type: "application/pdf", document_type_code: "IMG", review_status: "approved", processing_status: "done" } });
  }
  items.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const groups: Array<{ date: string; items: TimelineItem[] }> = [];
  for (const it of items) { const d = it.occurred_at.slice(0, 10); const g = groups.find((x) => x.date === d); if (g) g.items.push(it); else groups.push({ date: d, items: [it] }); }
  return { patient_id: pid, groups, page: 1, page_size: 25, total: items.length, total_pages: 1, types: ["consultation", "prescription", "document"], redacted: false };
}

function patientSummary(pid: string): AiPatientSummary {
  const cs = consultationsFor(pid).filter((c) => c.status !== "draft");
  const recent = cs.slice(0, 3).map((c, i) => ({ ref: `C${i + 1}`, consultation_id: c.id, date: c.consultation_date.slice(0, 10), status: c.status, chief_complaint: c.chief_complaint, assessment: c.assessment, plan: c.plan, codes: (diagnoses.get(c.id) ?? []).map((d) => d.code) }));
  const codes = new Map<string, string[]>();
  recent.forEach((e) => e.codes.forEach((code) => codes.set(code, [...(codes.get(code) ?? []), e.ref])));
  const active = [...codes.entries()].map(([code, refs]) => ({ code, description: describe(code), count: refs.length, first_seen: recent[recent.length - 1]?.date ?? "", last_seen: recent[0]?.date ?? "", active: true, source: "consultation_diagnoses", refs }));
  const meds = recent.length ? [{ ref: "P1", prescription_id: `${pid}-rx-1`, medication: "Morfina oral", dosage: "5 mg c/4h", instructions: null, start_date: daysAgo(10).slice(0, 10) }] : [];
  const narrative = recent.length
    ? `Paciente de 72 años, sexo femenino, en seguimiento por cuidados paliativos. Condiciones activas: ${active.map((a) => `${a.code} ${a.description} (${a.count} registro(s)) [${a.refs[0]}]`).join("; ")}. La última consulta firmada describe ${recent[0].assessment?.toLowerCase() ?? "control de síntomas"} [${recent[0].ref}]. Medicación activa: Morfina oral 5 mg c/4h [P1].`
    : "No hay consultas firmadas suficientes para generar un resumen.";
  return {
    ...envelope(), patient_id: pid, generated_at: now(), narrative, active_conditions: active,
    other_conditions: recent.length ? [{ code: "J18.9", description: describe("J18.9"), count: 1, first_seen: "2025-05-01", last_seen: "2025-05-01", active: false, source: "consultation_diagnoses", refs: ["C9"] }] : [],
    recent_events: recent, medications: meds,
    sources: [...recent.map((e) => ({ ref: e.ref, type: "consultation" as const, id: e.consultation_id, date: e.date })), ...meds.map((m) => ({ ref: m.ref, type: "prescription" as const, id: m.prescription_id, date: m.start_date ?? "" }))],
  };
}

// ---------------------------------------------------------------------------
// Audio transcription (synthetic: the audio is ignored, a canned palliative transcript comes back)
// ---------------------------------------------------------------------------
const STT_PRICE = 0.003;
const STT_TRANSCRIPT = [
  "Buenos días, ¿cómo ha pasado la semana? Regular, doctora, el dolor en la espalda no me deja dormir, lo pongo en ocho de diez.",
  "Además me falta el aire cuando camino al baño. No he tenido náuseas, pero llevo cuatro días sin evacuar y estoy más ansiosa por las noches.",
  "Está tomando la morfina de cinco miligramos cada cuatro horas. Tensión 120/80, frecuencia cardiaca 92, saturación 93 por ciento. ECOG 3, PPS 40 por ciento.",
  "Impresiona dolor oncológico mal controlado. Vamos a aumentar la morfina a diez miligramos cada cuatro horas, iniciar lactulosa quince mililitros cada doce horas y control en siete días.",
];
const sttSessions = new Map<string, { chunks: Map<number, { text: string; duration: number }> }>();
const sttError = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code });
function transcribe(consultationId: string, body: Record<string, unknown>) {
  const cons = consultations.get(consultationId);
  if (!cons) throw sttError(404, "NOT_FOUND", "Consultation not found");
  if (cons.status !== "draft") throw sttError(409, "CONFLICT", "La nota ya está firmada.");
  if (String(body.consent) !== "true") throw sttError(422, "CONSENT_REQUIRED", "Patient consent is required");
  const index = Number(body.chunk_index ?? 0);
  const final = String(body.final ?? "true") === "true";
  let sessionId = String(body.session_id ?? "");
  if (index === 0 && !sessionId) sessionId = `stt-${Date.now()}`;
  if (!sttSessions.has(sessionId)) {
    if (index > 0) throw sttError(422, "CHUNK_SEQUENCE", "Unknown transcription session");
    sttSessions.set(sessionId, { chunks: new Map() });
  }
  const session = sttSessions.get(sessionId)!;
  const duration = Math.max(1, Number(body.duration_seconds ?? 30));
  const text = STT_TRANSCRIPT[index % STT_TRANSCRIPT.length];
  session.chunks.set(index, { text: final && index === 0 ? STT_TRANSCRIPT.join(" ") : text, duration });
  const parts = [...session.chunks.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
  const totalDuration = parts.reduce((n, p) => n + p.duration, 0);
  const cost = Math.round((totalDuration / 60) * STT_PRICE * 1e6) / 1e6;
  const transcript = final ? parts.map((p) => p.text).join(" ") : null;
  const env = envelope();
  if (final) {
    sttSessions.delete(sessionId);
    consultations.set(cons.id, { ...cons, transcript, transcript_info: { provider: "mock", model: "gpt-4o-mini-transcribe", language: "es", duration_seconds: totalDuration, cost_estimate_usd: cost, chunks: parts.length, suggestion_id: env.suggestion_id, created_at: now() } });
  }
  return {
    consultation_id: cons.id, session_id: sessionId, chunk_index: index, final, chunks_received: session.chunks.size, chunk_text: text, transcript,
    provider: "mock", model: "gpt-4o-mini-transcribe", language: "es", duration_seconds: totalDuration, cost_estimate_usd: cost, price_per_min: STT_PRICE,
    audio_stored: false, suggestion_id: final ? env.suggestion_id : null, disclaimer: true, disclaimer_text: DISCLAIMER,
    draft: final && String(body.draft) === "true" ? draftNote(cons.id, transcript ?? "") : null,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const notFound = Symbol("not-handled");
export { notFound };

export function clinicalMock(method: string, path: string, query: Q, body: Record<string, unknown>): unknown | typeof notFound {
  const parts = path.split("/").filter(Boolean);
  const [a, b, c, d] = parts;
  if (a === "dashboard" && method === "get") return dashboardMock(b, query);
  if (a === "epi" && method === "get") {
    if (b === "summary") return summary(query);
    if (b === "top-diagnoses") return top(query, Number(query.limit || 10), (query.level as "code") || "code");
    if (b === "trend") return trend(query);
    if (b === "breakdown") return breakdown(query);
    if (b === "patients-by-diagnosis") return patientsByDiagnosis(query);
  }
  if (a === "ai") {
    if (b === "epi" && c === "insights") return insights(query);
    if (b === "epi" && c === "ask") return ask(String(body.question ?? ""));
    if (b === "patients" && d === "summary") return patientSummary(c);
    if (b === "consultations" && d === "draft-note") return draftNote(c, String(body.text ?? ""));
    if (b === "consultations" && d === "transcribe" && method === "post") return transcribe(c, body);
    if (b === "transcription" && c === "config") return { available: true, provider: "mock", model: "gpt-4o-mini-transcribe", language: "es", price_per_min: STT_PRICE, max_upload_mb: 25, chunk_max_mb: 24, server_chunking: false, formats: ["webm", "ogg", "m4a", "mp3", "wav"] };
    if (b === "suggestions" && (d === "accept" || d === "reject")) {
      if (d === "accept" && body.apply !== false) {
        const cons = consultations.get(suggestionTarget.get(c) ?? "");
        if (cons) {
          const soap = (body.soap ?? {}) as Partial<SoapNote>;
          const filled = Object.fromEntries(Object.entries(soap).filter(([, v]) => v));
          if (Object.keys(filled).length) patchConsultation(cons.id, { ...filled });
          const list = diagnoses.get(cons.id) ?? [];
          for (const code of (body.icd10_codes as string[] | undefined) ?? []) {
            if (!list.some((x) => x.code === code)) list.push({ id: `${cons.id}-dx-${Date.now()}-${code}`, consultation_id: cons.id, code, description: describe(code), system: "ICD-10", is_primary: list.length === 0, created_at: now() });
          }
          diagnoses.set(cons.id, list);
        }
      }
      return { id: c, type: "soap_draft", status: d === "accept" ? "accepted" : "rejected", provider: "offline", model: "rules-v1", consultation_id: null, patient_id: null, applied: null, reviewed_at: now(), created_at: now() };
    }
  }
  if (a === "icd10") {
    if (b === "search") {
      const q = (query.q ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(".", "");
      const hits = q ? icdCatalog.filter((x) => x.code.toLowerCase().replace(".", "").startsWith(q) || x.description_es.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).some((w) => w.startsWith(q))) : icdCatalog.filter((x) => x.is_favorite);
      return hits.slice(0, Number(query.limit || 20));
    }
    if (b === "codes") return icdCatalog.find((x) => x.code === c);
  }
  if (a === "consultations") {
    if (b === "patient" && c) return consultationsFor(c);
    if (method === "post" && !b) {
      const id = `consultation-new-${Date.now()}`;
      seedConsultation(id, String(body.patient_id), String(body.consultation_date ?? now()), "draft", { chief_complaint: (body.chief_complaint as string) ?? null }, []);
      return consultations.get(id);
    }
    if (b && consultations.has(b)) {
      if (c === "diagnoses") {
        const list = diagnoses.get(b) ?? [];
        if (method === "post") {
          const code = String(body.code);
          if (list.some((x) => x.code === code)) throw conflict("Código duplicado en la consulta.");
          list.push({ id: `${b}-dx-${Date.now()}`, consultation_id: b, code, description: describe(code), system: "ICD-10", is_primary: list.length === 0 || !!body.is_primary, created_at: now() });
          if (body.is_primary) list.forEach((x, i) => (x.is_primary = i === list.length - 1));
        } else if (method === "patch" && d) list.forEach((x) => (x.is_primary = x.id === d));
        else if (method === "delete" && d) {
          const idx = list.findIndex((x) => x.id === d);
          const wasPrimary = list[idx]?.is_primary;
          if (idx >= 0) list.splice(idx, 1);
          if (wasPrimary && list[0]) list[0].is_primary = true;
        }
        diagnoses.set(b, list);
        return [...list].sort((x, y) => Number(y.is_primary) - Number(x.is_primary));
      }
      if (c === "sign") {
        const cons = consultations.get(b)!;
        if (!new Array<SoapField>("chief_complaint", "history_present_illness", "past_history", "physical_exam", "assessment", "plan").some((f) => cons[f])) throw Object.assign(new Error("La nota está vacía."), { status: 400 });
        const next = { ...cons, status: "signed" as const, signed_by: "preview-user", signed_at: now(), version: cons.version + 1 };
        consultations.set(b, next);
        return next;
      }
      if (c === "amendments") {
        const cons = consultations.get(b)!;
        const next = { ...cons, status: "amended" as const, version: cons.version + 1, amendments: [...cons.amendments, { id: `amend-${Date.now()}`, content: String(body.content), reason: (body.reason as string) ?? null, author_user_id: "preview-user", created_at: now() }] };
        consultations.set(b, next);
        return next;
      }
      if (method === "patch") return patchConsultation(b, body);
      if (method === "get") return consultations.get(b);
    }
    if (b && method === "get" && !consultations.has(b)) return consultationsFor(b); // legacy list fallback
  }
  if (a === "patients" && c === "timeline") return timeline(b);
  if (a === "admin" && b === "staff") {
    if (!c && method === "get") {
      const t = query.type; const qs = (query.q ?? "").toLowerCase();
      const items = staff.filter((s) => (!t || s.type === t) && (!qs || s.full_name.toLowerCase().includes(qs) || s.email.includes(qs)));
      return { items, page: 1, page_size: 100, total: items.length, total_pages: 1 };
    }
    if (!c && method === "post") {
      const s: StaffRead = { id: `user-new-${Date.now()}`, type: body.type as "doctor", role: body.type as "doctor", profile_id: `p-${Date.now()}`, doctor_id: (body.doctor_id as string) ?? null, first_name: String(body.first_name), last_name: String(body.last_name), full_name: `${body.first_name} ${body.last_name}`, email: String(body.email), phone: (body.phone as string) || null, specialty: (body.specialty as string) || null, license_number: (body.license_number as string) || null, notes: null, is_active: true, created_at: now(), updated_at: now() };
      staff.unshift(s);
      return s;
    }
    const s = staff.find((x) => x.id === c);
    if (s && d === "reset-password") return { id: s.id, temporary_password: "x7Q-rb4k-T2mz" };
    if (s && method === "patch") { Object.assign(s, body, { updated_at: now() }); return s; }
    if (s) return s;
  }
  return notFound;
}
