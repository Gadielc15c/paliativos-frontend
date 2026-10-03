// Home dashboard contracts (`/dashboard/*`). Source of truth: ../paliativos-backend/API_CHANGES.md
import type { EpiPeriod } from "./clinical";

export type AlertSeverity = "alert" | "watch" | "info";
export type AlertType =
  | "unsigned_drafts" | "overdue_followup" | "frequent_visits" | "new_symptoms"
  | "missing_diagnosis" | "epi_spike" | "unpaid_invoices" | "inactive_staff";

export interface PatientRef { id: string; display_name: string; note: string | null }

export interface DashboardFilters { doctor_id: string | null; followup_days: number | null }

export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  count: number;
  patients: PatientRef[];
  action: { label: string; route: string };
  occurred_at: string;
}

export interface DashboardAlerts {
  generated_at: string;
  period: EpiPeriod;
  filters: DashboardFilters;
  counts: Record<AlertSeverity, number>;
  items: DashboardAlert[];
}

export interface DashboardToday {
  generated_at: string;
  date: string;
  filters: DashboardFilters;
  summary: { consultations_today: number; drafts_open: number | null; followups_due_week: number };
  recent_patients: Array<{ patient: PatientRef; last_seen_at: string; consultation_id: string | null; status: "draft" | "signed" | "amended" | null }>;
  drafts_in_progress: Array<{ consultation_id: string; patient: PatientRef; doctor_id: string; consultation_date: string; updated_at: string; hours_open: number }> | null;
  upcoming_followups: Array<{ patient: PatientRef; doctor_id: string; last_seen_at: string; due_date: string; days_until_due: number }>;
}

export interface DeltaMetric { value: number; previous: number; delta: number; delta_pct: number | null }
export interface Ratio { numerator: number; denominator: number; pct: number | null }

export interface DashboardKpis {
  period: EpiPeriod;
  previous_period: EpiPeriod;
  filters: DashboardFilters;
  active_patients: number;
  new_patients: DeltaMetric;
  consultations: DeltaMetric;
  patients_seen: number;
  avg_consultations_per_patient: number | null;
  median_days_between_consultations: number | null;
  signed: Ratio;
  coded_cie10: Ratio;
  primary_diagnosis: Ratio;
  ai: {
    draft_notes_generated: number; draft_notes_accepted: number; draft_notes_edited: number; draft_notes_rejected: number;
    draft_notes_pending: number; acceptance_rate_pct: number | null;
    transcriptions: number; transcription_minutes: number; transcription_cost_usd: number;
  };
  age_distribution: Array<{ key: string; label: string; patients: number; share_pct: number }>;
}

export interface DashboardActivity {
  period: EpiPeriod;
  filters: DashboardFilters;
  interval: "day" | "week" | "month";
  buckets: string[];
  series: Array<{ bucket: string; consultations: number; new_patients: number; signed_notes: number }>;
  totals: { bucket: "total"; consultations: number; new_patients: number; signed_notes: number };
  workload: Array<{
    doctor_id: string; doctor_name: string; is_active: boolean; consultations: number; patients: number;
    active_patients: number; unsigned_drafts: number; avg_days_to_sign: number | null;
  }>;
}

export interface DashboardQuality {
  period: EpiPeriod;
  filters: DashboardFilters;
  free_text_diagnoses: {
    total: number;
    by_source: { diagnostics: number; patient_conditions: number };
    uncoded_consultations_with_assessment: number;
    sample: Array<{ source: "diagnostics" | "patient_conditions"; id: string; patient: PatientRef; text: string; code: string | null; recorded_at: string }>;
  };
  missing_soap: {
    sections: string[];
    consultations_checked: number;
    consultations_incomplete: number;
    by_section: Record<string, number>;
    sample: Array<{ consultation_id: string; patient: PatientRef; consultation_date: string; missing: string[] }>;
  };
  duplicate_patients: Array<{
    reason: "document" | "name_birthdate";
    key: string;
    patients: Array<{ id: string; display_name: string; document_number: string | null; birth_date: string | null; doctor_id: string; created_at: string }>;
  }>;
}

export interface DashboardParams { date_from?: string; date_to?: string; doctor_id?: string; followup_days?: number; interval?: "day" | "week" | "month"; limit?: number }
