/**
 * Development-only fixtures for `/dashboard/*` (home "Inicio"). Every alert type of the
 * contract is present for admin; doctor and secretary get the same scoping as the backend.
 * `?data=empty` returns empty lists, `?data=worst` long names and big counts.
 */
import type {
  DashboardActivity, DashboardAlert, DashboardAlerts, DashboardKpis, DashboardQuality, DashboardToday, PatientRef,
} from "../types/dashboard";

const params = new URLSearchParams(location.search);
const mode = params.get("data") || "demo";
const worst = mode === "worst";
const empty = mode === "empty";
const role = (["admin", "doctor", "secretary"] as const).find((r) => r === params.get("role")) ?? "admin";

const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const today = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
const ago = (days: number, hour = 15) => new Date(today() - days * DAY + hour * 3600000).toISOString();
const forbidden = () => Object.assign(new Error("Permisos insuficientes"), { status: 403, code: "FORBIDDEN" });

const LONG = "María de los Ángeles Fernanda de la Santísima Trinidad Fernández de Córdoba";
// patient-1..4 exist in the base mock, so "Ver paciente" opens a real profile.
const P: PatientRef[] = [
  { id: "patient-1", display_name: worst ? LONG : "Elena Rodríguez", note: null },
  { id: "patient-2", display_name: "Carlos Mendoza", note: null },
  { id: "patient-3", display_name: "Ana María Pérez", note: null },
  { id: "patient-4", display_name: "José Luis Gutiérrez", note: null },
  { id: "patient-5", display_name: "Teresa Almonte Reyes", note: null },
  { id: "patient-6", display_name: "Rosa Santos Núñez", note: null },
  { id: "patient-7", display_name: "Juan Díaz Herrera", note: null },
];
const ref = (i: number, note: string | null = null): PatientRef => ({ ...P[i % P.length], note });

function period(q: Record<string, string | undefined>) {
  const to = q.date_to ? Date.parse(q.date_to) : today();
  const from = q.date_from ? Date.parse(q.date_from) : to - 29 * DAY;
  const days = Math.round((to - from) / DAY) + 1;
  return { date_from: iso(from), date_to: iso(to), days };
}
const prevPeriod = (p: { date_from: string; days: number }) => {
  const to = Date.parse(p.date_from) - DAY;
  return { date_from: iso(to - (p.days - 1) * DAY), date_to: iso(to), days: p.days };
};
const filters = (q: Record<string, string | undefined>, followup: number | null = null) => ({ doctor_id: role === "admin" ? q.doctor_id ?? null : "doctor-1", followup_days: followup });

function alerts(q: Record<string, string | undefined>): DashboardAlerts {
  const p = period(q);
  const fd = Number(q.followup_days || 14);
  const k = worst ? 37 : 1;
  const all: DashboardAlert[] = [
    { id: "unsigned_drafts:doctor-1", type: "unsigned_drafts", severity: "alert", title: worst ? "37 notas sin firmar" : "2 notas sin firmar",
      detail: `${worst ? LONG : "Dra. Lucía Mendoza"}: borradores abiertos hace más de 24 h. El más antiguo lleva 98 h.`, count: 2 * k,
      patients: [ref(3, "hace 4 días"), ref(1, "hace 2 días")], action: { label: "Revisar y firmar", route: "/consultations/consultation-1" }, occurred_at: ago(4, 10) },
    { id: "frequent_visits", type: "frequent_visits", severity: "alert", title: "2 pacientes con consultas frecuentes",
      detail: "3 o más consultas en los últimos 14 días: posible deterioro.", count: 2,
      patients: [ref(0, "3 consultas"), ref(5, "4 consultas")], action: { label: "Ver paciente", route: "/patients?patientId=patient-1" }, occurred_at: ago(2) },
    { id: "new_symptoms:R52", type: "new_symptoms", severity: "alert", title: "Dolor nuevo en 1 paciente",
      detail: "R52 Dolor registrado por primera vez en los últimos 7 días.", count: 1,
      patients: [ref(2, "R52.2 · hace 3 días")], action: { label: "Ver paciente", route: "/patients?patientId=patient-3" }, occurred_at: ago(3) },
    { id: "inactive_staff:doctor-4", type: "inactive_staff", severity: "alert", title: "Médico inactivo con 2 pacientes",
      detail: "Dr. Ramón Vargas está desactivado y todavía tiene pacientes activos asignados. Reasígnalos.", count: 2,
      patients: [ref(4), ref(6)], action: { label: "Ver equipo", route: "/equipo?staffId=user-doc-4" }, occurred_at: ago(6) },
    { id: "overdue_followup", type: "overdue_followup", severity: "watch", title: worst ? "1.284 pacientes sin seguimiento" : "7 pacientes sin seguimiento",
      detail: `Pacientes activos sin consulta en más de ${fd} días. El más atrasado: 64 días.`, count: worst ? 1284 : 7,
      patients: [ref(4, "hace 64 días"), ref(6, "hace 31 días"), ref(1, "hace 22 días"), ref(3, "hace 19 días"), ref(5, "hace 16 días")],
      action: { label: "Programar seguimiento", route: "/patients?filter=overdue_followup" }, occurred_at: ago(64) },
    { id: "epi:respiratory:new:J18.9", type: "epi_spike", severity: "watch", title: "Nuevo: J18.9 Neumonía, no especificada",
      detail: "6 diagnósticos en el período sin casos en los 6 períodos previos.", count: 6, patients: [],
      action: { label: "Ver epidemiología", route: `/epidemiologia?category=respiratory&date_from=${p.date_from}&date_to=${p.date_to}` }, occurred_at: ago(0) },
    { id: "unpaid_invoices", type: "unpaid_invoices", severity: "watch", title: "3 facturas pendientes de cobro",
      detail: "Emitidas hace más de 30 días. La más antigua: 74 días.", count: 3,
      patients: [ref(0, "RD$1,000.00"), ref(1, "RD$3,500.00"), ref(2, "RD$850.00")], action: { label: "Ver facturas", route: "/billing?status=overdue" }, occurred_at: ago(74) },
    { id: "missing_diagnosis", type: "missing_diagnosis", severity: "info", title: "3 consultas firmadas sin CIE-10",
      detail: "Sin diagnóstico codificado no cuentan en Epidemiología.", count: 3,
      patients: [ref(6), ref(5)], action: { label: "Codificar ahora", route: "/patients?filter=missing_diagnosis" }, occurred_at: ago(9) },
  ];
  const visible = empty ? [] : all.filter((a) =>
    role === "secretary" ? a.type === "overdue_followup" : role === "doctor" ? !["unpaid_invoices", "inactive_staff"].includes(a.type) : true);
  const counts = { alert: 0, watch: 0, info: 0 };
  visible.forEach((a) => counts[a.severity]++);
  return { generated_at: new Date().toISOString(), period: p, filters: { doctor_id: filters(q).doctor_id, followup_days: fd }, counts, items: visible };
}

function todayData(q: Record<string, string | undefined>): DashboardToday {
  const sec = role === "secretary";
  const fd = Number(q.followup_days || 14);
  const recent = empty ? [] : [
    { patient: ref(0, "hoy"), last_seen_at: ago(0, 13), consultation_id: sec ? null : "consultation-1", status: sec ? null : ("draft" as const) },
    { patient: ref(1, "ayer"), last_seen_at: ago(1, 11), consultation_id: sec ? null : "consultation-5", status: sec ? null : ("signed" as const) },
    { patient: ref(2, "hace 3 días"), last_seen_at: ago(3), consultation_id: sec ? null : "consultation-8", status: sec ? null : ("signed" as const) },
    { patient: ref(3, "hace 4 días"), last_seen_at: ago(4), consultation_id: sec ? null : "consultation-11", status: sec ? null : ("amended" as const) },
  ];
  const drafts = sec ? null : empty ? [] : [
    { consultation_id: "consultation-1", patient: ref(0), doctor_id: "doctor-1", consultation_date: ago(0, 13), updated_at: ago(0, 14), hours_open: 2.1 },
    { consultation_id: "consultation-4", patient: ref(1), doctor_id: "doctor-1", consultation_date: ago(4, 10), updated_at: ago(4, 11), hours_open: 98.4 },
  ];
  const follow = empty ? [] : [
    { patient: ref(5, "hace 10 días"), doctor_id: "doctor-1", last_seen_at: ago(10), due_date: iso(today() + 4 * DAY), days_until_due: 4 },
    { patient: ref(6, "hace 12 días"), doctor_id: "doctor-2", last_seen_at: ago(12), due_date: iso(today() + 2 * DAY), days_until_due: 2 },
    { patient: ref(3, "hace 13 días"), doctor_id: "doctor-1", last_seen_at: ago(13), due_date: iso(today() + DAY), days_until_due: 1 },
  ];
  return {
    generated_at: new Date().toISOString(), date: iso(today()), filters: { doctor_id: filters(q).doctor_id, followup_days: fd },
    summary: { consultations_today: empty ? 0 : 2, drafts_open: sec ? null : drafts!.length, followups_due_week: follow.length },
    recent_patients: recent, drafts_in_progress: drafts, upcoming_followups: follow,
  };
}

function kpis(q: Record<string, string | undefined>): DashboardKpis {
  if (role === "secretary") throw forbidden();
  const p = period(q);
  const z = empty;
  const n = (v: number) => (z ? 0 : worst ? v * 137 : v);
  // Same numbers as /dashboard/activity so the chart total matches the KPI tile.
  const act = activity({ ...q, interval: undefined }).totals;
  const raw = (v: number, prev: number) => ({ value: v, previous: prev, delta: v - prev, delta_pct: prev ? Math.round(((v - prev) / prev) * 1000) / 10 : null });
  const rawRatio = (num: number, den: number) => ({ numerator: num, denominator: den, pct: den ? Math.round((num / den) * 1000) / 10 : null });
  const ages: Array<[string, string, number]> = [["0-17", "0-17 años", 0], ["18-39", "18-39 años", 2], ["40-59", "40-59 años", 9], ["60-74", "60-74 años", 18], ["75+", "75+ años", 15], ["unknown", "Sin dato", 1]];
  const total = ages.reduce((a, [, , v]) => a + n(v), 0);
  return {
    period: p, previous_period: prevPeriod(p), filters: filters(q),
    active_patients: n(45), new_patients: raw(act.new_patients, Math.round(act.new_patients * 0.5)), consultations: raw(act.consultations, Math.round(act.consultations * 0.7)), patients_seen: n(30),
    avg_consultations_per_patient: z ? null : 1.93, median_days_between_consultations: z ? null : 6.5,
    signed: rawRatio(act.signed_notes, act.consultations), coded_cie10: rawRatio(Math.round(act.consultations * 0.95), act.consultations), primary_diagnosis: rawRatio(Math.round(act.consultations * 0.95), act.consultations),
    ai: { draft_notes_generated: n(12), draft_notes_accepted: n(5), draft_notes_edited: n(3), draft_notes_rejected: n(2), draft_notes_pending: n(2),
      acceptance_rate_pct: z ? null : 80, transcriptions: n(6), transcription_minutes: z ? 0 : worst ? 7439.1 : 54.3, transcription_cost_usd: z ? 0 : worst ? 22.3173 : 0.1629 },
    age_distribution: ages.map(([key, label, v]) => ({ key, label, patients: n(v), share_pct: total ? Math.round((n(v) / total) * 1000) / 10 : 0 })),
  };
}

function activity(q: Record<string, string | undefined>): DashboardActivity {
  if (role === "secretary") throw forbidden();
  const p = period(q);
  const interval = (q.interval as DashboardActivity["interval"]) || (p.days <= 31 ? "day" : p.days <= 183 ? "week" : "month");
  const buckets: string[] = [];
  const bucketOf = (t: number) => {
    const d = iso(t);
    if (interval === "day") return d;
    if (interval === "month") return d.slice(0, 7);
    const wd = (new Date(t).getUTCDay() + 6) % 7; return iso(t - wd * DAY);
  };
  for (let t = Date.parse(p.date_from); t <= Date.parse(p.date_to); t += DAY) { const b = bucketOf(t); if (buckets[buckets.length - 1] !== b) buckets.push(b); }
  let s = 7;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const scale = interval === "day" ? 1 : interval === "week" ? 6 : 24;
  const series = buckets.map((bucket, i) => {
    const weekday = interval === "day" ? new Date(`${bucket}T12:00:00Z`).getUTCDay() : 3;
    const base = empty ? 0 : weekday === 0 || weekday === 6 ? 0.4 : 2.2;
    const c = Math.round((base + r() * 1.6 + (i > buckets.length * 0.7 ? 0.6 : 0)) * scale * (worst ? 30 : 1));
    return { bucket, consultations: c, new_patients: empty ? 0 : Math.round((r() < 0.2 ? 1 : 0) * scale * 0.8 * (worst ? 30 : 1)), signed_notes: Math.max(0, c - Math.round(r() * scale)) };
  });
  const totals = series.reduce<DashboardActivity["totals"]>((a, x) => ({ bucket: "total", consultations: a.consultations + x.consultations, new_patients: a.new_patients + x.new_patients, signed_notes: a.signed_notes + x.signed_notes }), { bucket: "total", consultations: 0, new_patients: 0, signed_notes: 0 });
  const workload = empty ? [] : [
    { doctor_id: "doctor-1", doctor_name: worst ? "Dra. María de los Ángeles Fernández de Córdoba y Santísima Trinidad" : "Dra. Lucía Mendoza", is_active: true, consultations: 31, patients: 17, active_patients: 22, unsigned_drafts: 2, avg_days_to_sign: 0.4 },
    { doctor_id: "doctor-2", doctor_name: "Dr. Andrés Medina", is_active: true, consultations: 19, patients: 11, active_patients: 14, unsigned_drafts: 0, avg_days_to_sign: 1.2 },
    { doctor_id: "doctor-3", doctor_name: "Dra. Paula Castillo", is_active: true, consultations: 8, patients: 6, active_patients: 7, unsigned_drafts: 1, avg_days_to_sign: 2.8 },
    { doctor_id: "doctor-4", doctor_name: "Dr. Ramón Vargas", is_active: false, consultations: 0, patients: 0, active_patients: 2, unsigned_drafts: 0, avg_days_to_sign: null },
  ];
  return { period: p, filters: filters(q), interval, buckets, series, totals, workload: role === "doctor" ? workload.slice(0, 1) : workload };
}

function quality(q: Record<string, string | undefined>): DashboardQuality {
  if (role === "secretary") throw forbidden();
  const p = period(q);
  if (empty) return {
    period: p, filters: filters(q),
    free_text_diagnoses: { total: 0, by_source: { diagnostics: 0, patient_conditions: 0 }, uncoded_consultations_with_assessment: 0, sample: [] },
    missing_soap: { sections: ["chief_complaint", "physical_exam", "assessment", "plan"], consultations_checked: 0, consultations_incomplete: 0, by_section: { chief_complaint: 0, physical_exam: 0, assessment: 0, plan: 0 }, sample: [] },
    duplicate_patients: [],
  };
  return {
    period: p, filters: filters(q),
    free_text_diagnoses: {
      total: worst ? 1284 : 5, by_source: { diagnostics: worst ? 1200 : 4, patient_conditions: worst ? 84 : 1 }, uncoded_consultations_with_assessment: 3,
      sample: [
        { source: "diagnostics", id: "dx-legacy-1", patient: ref(5), text: worst ? "Ca de pulmón avanzado con metástasis óseas múltiples y derrame pleural maligno recidivante" : "Ca de pulmón avanzado", code: null, recorded_at: ago(120) },
        { source: "diagnostics", id: "dx-legacy-2", patient: ref(6), text: "dolor cronico", code: null, recorded_at: ago(95) },
        { source: "patient_conditions", id: "cond-legacy-1", patient: ref(2), text: "HTA", code: null, recorded_at: ago(60) },
      ],
    },
    missing_soap: {
      sections: ["chief_complaint", "physical_exam", "assessment", "plan"], consultations_checked: 52, consultations_incomplete: 2,
      by_section: { chief_complaint: 0, physical_exam: 1, assessment: 0, plan: 2 },
      sample: [
        { consultation_id: "consultation-2", patient: ref(6), consultation_date: ago(13), missing: ["plan"] },
        { consultation_id: "consultation-5", patient: ref(1), consultation_date: ago(10), missing: ["physical_exam", "plan"] },
      ],
    },
    duplicate_patients: [
      { reason: "document", key: "demo-0002", patients: [
        { id: "patient-2", display_name: "Juan Díaz", document_number: "DEMO-0002", birth_date: "1950-02-01", doctor_id: "doctor-1", created_at: ago(260) },
        { id: "patient-4", display_name: "Copia Documento", document_number: "demo-0002", birth_date: "1960-06-06", doctor_id: "doctor-1", created_at: ago(0) },
      ] },
    ],
  };
}

/** Router hook for `/dashboard/*`. Returns undefined for unknown paths. */
export function dashboardMock(endpoint: string, query: Record<string, string | undefined>): unknown {
  switch (endpoint) {
    case "alerts": return alerts(query);
    case "today": return todayData(query);
    case "kpis": return kpis(query);
    case "activity": return activity(query);
    case "quality": return quality(query);
    default: return undefined;
  }
}
