// Fase 1 (SOAP, CIE-10, timeline, staff) + Fase 2/3 (epidemiología, IA) contracts.
// Source of truth: ../paliativos-backend/API_CHANGES.md

export type ConsultationStatus = "draft" | "signed" | "amended";

export const SOAP_FIELDS = [
  "chief_complaint",
  "history_present_illness",
  "past_history",
  "physical_exam",
  "assessment",
  "plan",
] as const;
export type SoapField = (typeof SOAP_FIELDS)[number];
export type SoapNote = Record<SoapField, string | null>;

export const SOAP_LABELS: Record<SoapField, string> = {
  chief_complaint: "Motivo de consulta",
  history_present_illness: "Enfermedad actual",
  past_history: "Antecedentes",
  physical_exam: "Examen físico",
  assessment: "Evaluación",
  plan: "Plan",
};

export interface ConsultationAmendment {
  id: string;
  content: string;
  reason: string | null;
  author_user_id: string;
  created_at: string;
}

export interface ConsultationRead extends SoapNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  consultation_date: string;
  reason: string;
  notes: string | null;
  status: ConsultationStatus;
  version: number;
  signed_by: string | null;
  signed_at: string | null;
  amendments: ConsultationAmendment[];
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  /** Last audio transcription (POST /ai/consultations/{id}/transcribe). Older backends omit it. */
  transcript?: string | null;
  transcript_info?: TranscriptInfo | null;
}

export interface TranscriptInfo {
  provider: string;
  model: string;
  language: string;
  duration_seconds: number;
  cost_estimate_usd: number;
  chunks: number;
  suggestion_id: string | null;
  created_at: string;
}

export interface Icd10Code {
  code: string;
  description_es: string;
  chapter: string;
  is_billable: boolean;
  is_favorite: boolean;
  use_count: number;
}

export interface ConsultationDiagnosis {
  id: string;
  consultation_id: string;
  code: string;
  description: string;
  system: string;
  is_primary: boolean;
  created_at: string;
}

// ---- Timeline -------------------------------------------------------------
export type TimelineType = "consultation" | "prescription" | "document";

export interface TimelineItem {
  id: string;
  type: TimelineType;
  occurred_at: string;
  doctor_id?: string | null;
  doctor_name?: string | null;
  consultation?: {
    status: ConsultationStatus;
    signed_at: string | null;
    amendment_count: number;
    reason: string;
    chief_complaint: string | null;
    assessment: string | null;
    plan: string | null;
    diagnoses: Array<{ code: string; description: string; is_primary: boolean }>;
  } | null;
  prescription?: {
    medication: string;
    dosage: string | null;
    instructions: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
  document?: {
    title: string;
    file_name: string;
    mime_type: string;
    document_type_code: string | null;
    review_status: string;
    processing_status: string;
  } | null;
}

export interface TimelineResponse {
  patient_id: string;
  groups: Array<{ date: string; items: TimelineItem[] }>;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  types: TimelineType[];
  redacted: boolean;
}

// ---- Staff ----------------------------------------------------------------
export interface StaffRead {
  id: string;
  type: "doctor" | "secretary";
  role: "admin" | "doctor" | "secretary";
  profile_id: string;
  doctor_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Epidemiology ---------------------------------------------------------
export interface EpiPeriod { date_from: string; date_to: string; days: number }

export interface EpiFilters {
  date_from?: string;
  date_to?: string;
  doctor_id?: string;
  sex?: string;
  age_group?: string;
  chapter?: string;
  code?: string;
  primary_only?: boolean;
}

export interface EpiMetric { value: number; previous: number; delta: number; delta_pct: number | null }

export interface EpiSummary {
  period: EpiPeriod;
  previous_period: EpiPeriod;
  filters: Record<string, unknown>;
  consultations: EpiMetric;
  patients: EpiMetric;
  diagnoses: EpiMetric;
  distinct_codes: EpiMetric;
  data_quality: { consultations_total: number; consultations_without_diagnosis: number; consultations_unsigned: number };
}

export interface EpiTopItem {
  rank: number;
  code: string;
  description: string;
  count: number;
  patients: number;
  share_pct: number;
  previous_count: number;
  delta: number;
  delta_pct: number | null;
}

export interface EpiTop {
  period: EpiPeriod;
  level: "code" | "category";
  total_diagnoses: number;
  items: EpiTopItem[];
}

export interface EpiTrendSeries {
  key: string;
  label: string;
  total: number;
  points: Array<{ bucket: string; value: number }>;
}

export interface EpiTrend {
  period: EpiPeriod;
  interval: "day" | "week" | "month";
  metric: "diagnoses" | "consultations" | "patients";
  buckets: string[];
  series: EpiTrendSeries[];
}

export type EpiBreakdownBy = "sex" | "age_group" | "age_sex" | "doctor" | "chapter";

export interface EpiBreakdownItem {
  key: string;
  label: string;
  sex?: string;
  age_group?: string;
  diagnoses: number;
  consultations: number;
  patients: number;
  share_pct: number;
}

export interface EpiBreakdown {
  period: EpiPeriod;
  by: EpiBreakdownBy;
  total_diagnoses: number;
  items: EpiBreakdownItem[];
}

export interface EpiPatientRow {
  patient_id: string;
  full_name: string;
  sex: string;
  age: number | null;
  age_group: string;
  doctor_id: string;
  doctor_name: string;
  diagnoses: number;
  codes: string[];
  first_date: string;
  last_date: string;
  last_consultation_id: string | null;
}

export interface EpiPatientsPage {
  items: EpiPatientRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

// ---- AI -------------------------------------------------------------------
export interface AiEnvelope {
  suggestion_id: string;
  provider: string;
  model: string;
  fallback: boolean;
  disclaimer: boolean;
  disclaimer_text: string;
}

export interface AiIcd10Suggestion {
  code: string;
  description: string;
  rationale: string;
  evidence: string | null;
  evidence_verified: boolean;
  source: "model" | "catalog_search";
}

export interface AiDraftNote extends AiEnvelope {
  consultation_id: string;
  status: "pending";
  soap: SoapNote;
  icd10_suggestions: AiIcd10Suggestion[];
  deidentified: Record<string, number>;
}

export interface AiTranscription {
  consultation_id: string;
  session_id: string;
  chunk_index: number;
  final: boolean;
  chunks_received: number;
  chunk_text: string;
  /** Full text, only on the final chunk. */
  transcript: string | null;
  provider: string;
  model: string;
  language: string;
  /** Totals so far (whole session). */
  duration_seconds: number;
  cost_estimate_usd: number;
  price_per_min: number;
  audio_stored: boolean;
  suggestion_id: string | null;
  disclaimer: boolean;
  disclaimer_text: string;
  draft: AiDraftNote | null;
}

export interface AiTranscriptionConfig {
  available: boolean;
  provider: string;
  model: string;
  language: string;
  price_per_min: number;
  max_upload_mb: number;
  chunk_max_mb: number;
  server_chunking: boolean;
  formats: string[];
}

export interface AiSuggestionRead {
  id: string;
  type: "soap_draft" | "patient_summary" | "epi_answer" | "epi_insights";
  status: "pending" | "accepted" | "edited" | "rejected";
  provider: string;
  model: string;
  consultation_id: string | null;
  patient_id: string | null;
  applied: { consultation_id: string; consultation_version: number; fields: string[]; diagnoses_added: string[]; diagnoses_skipped: string[] } | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AiAcceptBody {
  soap?: Partial<SoapNote>;
  icd10_codes?: string[];
  primary_code?: string;
  version?: number;
  apply?: boolean;
  note?: string;
}

export interface AiPatientSummary extends AiEnvelope {
  patient_id: string;
  generated_at: string;
  narrative: string;
  active_conditions: Array<{ code: string; description: string; count: number; first_seen: string; last_seen: string; active: boolean; source: string; refs: string[] }>;
  other_conditions: AiPatientSummary["active_conditions"];
  recent_events: Array<{ ref: string; consultation_id: string; date: string; status: ConsultationStatus; chief_complaint: string | null; assessment: string | null; plan: string | null; codes: string[] }>;
  medications: Array<{ ref: string; prescription_id: string; medication: string; dosage: string | null; instructions: string | null; start_date: string | null }>;
  sources: Array<{ ref: string; type: "consultation" | "prescription" | "condition"; id: string; date: string }>;
}

export type EpiChartHint = { type: "kpi" | "bar" | "line" | "pie" | "pyramid"; orientation?: "horizontal" | "vertical"; x?: string; y?: string; label?: string };

export interface AiEpiAnswer extends AiEnvelope {
  question: string;
  answer: string;
  intent: "summary" | "top_diagnoses" | "trend" | "breakdown" | "insights";
  intent_source: "model" | "fallback";
  params: Record<string, unknown>;
  data: Array<Record<string, unknown>>;
  chart_hint: EpiChartHint;
  period: EpiPeriod;
  /** Present when the answer is a set of category insights (rendered as the same cards). */
  categories?: EpiInsightCategory[];
}

export type InsightSeverity = "info" | "watch" | "alert";
export type InsightKind = "increase" | "decrease" | "spike" | "new" | "top";

export interface EpiInsightItem {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  metric: { value: number; previous: number | null; delta_pct: number | null; unit: string };
  codes: Array<{ code: string; description: string; count: number }>;
  explanation: string;
  evidence_query?: unknown;
}

export interface EpiInsightCategory {
  category_key: string;
  label: string;
  icd_chapter: string | null;
  icd_range: string | null;
  total_cases: number;
  delta_pct: number | null;
  trend: Array<{ bucket: string; count: number }>;
  insights: EpiInsightItem[];
}

/** GET /ai/epi/insights — grouped by disease category. */
export interface AiEpiInsights {
  period: EpiPeriod;
  categories: EpiInsightCategory[];
  generated_by: string;
  model: string;
  disclaimer: string;
  suggestion_id?: string;
}
