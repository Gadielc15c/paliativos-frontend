import type { UserRole } from "./common";

export type DecimalValue = number | string;

export interface PageResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface CurrentUserResponse {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  doctor_id: string | null;
  is_active: boolean;
}

export interface DoctorRecord {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty: string | null;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface PatientRecord {
  id: string;
  doctor_id: string;
  created_by_user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  document_number: string;
  birth_date: string | null;
  gender: "female" | "male" | "other" | "unknown" | null;
  phone: string | null;
  secondary_phone: string | null;
  address: string | null;
  insurer_name: string | null;
  status: "active" | "inactive" | "deceased";
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EpisodeRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  episode_type: string;
  start_date: string;
  end_date: string | null;
  diagnosis: string | null;
  insurer_name: string | null;
  notes: string | null;
  status: "open" | "closed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemSnapshotRecord {
  item_id: string;
  description: string;
  quantity: DecimalValue;
  unit_price: DecimalValue;
  subtotal: DecimalValue;
  insurer_covered_amount: DecimalValue;
  patient_amount: DecimalValue;
}

export interface InvoiceItemRecord {
  id: string;
  invoice_id: string;
  description: string;
  quantity: DecimalValue;
  unit_price: DecimalValue;
  subtotal: DecimalValue;
  insurer_covered_amount: DecimalValue;
  patient_amount: DecimalValue;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  episode_id: string | null;
  created_by_user_id: string;
  invoice_number: string;
  issue_date: string;
  insurer_name: string | null;
  subtotal: DecimalValue;
  discounts: DecimalValue;
  total: DecimalValue;
  insurer_expected_amount: DecimalValue;
  patient_expected_amount: DecimalValue;
  status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
  notes: string | null;
  items_snapshot: InvoiceItemSnapshotRecord[];
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  patient_id: string;
  doctor_id: string;
  payer_type: string;
  amount: DecimalValue;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRecord {
  id: string;
  doctor_id: string | null;
  description: string;
  category: string;
  amount: DecimalValue;
  expense_date: string;
  created_by_user_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  patient_id: string | null;
  episode_id: string | null;
  doctor_id: string | null;
  document_type_id: string | null;
  declared_document_type_id: string | null;
  title: string;
  file_name: string | null;
  file_path: string | null;
  mime_type: string | null;
  storage_provider: string | null;
  processing_status: string;
  predicted_document_type_code: string | null;
  classification_confidence: number | null;
  classification_method: string | null;
  classifier_version: string | null;
  validation_flags: string[];
  review_status: string;
  application_status: string;
  current_extraction_result_id: string | null;
  matched_patient_id: string | null;
  processed_at: string | null;
  applied_at: string | null;
  file_hash: string | null;
  page_count: number | null;
  storage_bucket: string | null;
  storage_object_key: string | null;
  storage_etag: string | null;
  minio_path?: string | null;
  metadata: Record<string, unknown> | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemServiceStatus {
  status: "ok" | "degraded" | "down" | "unknown";
  message?: string | null;
  details?: Record<string, unknown> | null;
}

export interface SystemStatusResponse {
  backend: SystemServiceStatus | string;
  database: SystemServiceStatus | string;
  minio: SystemServiceStatus | string;
  llm: SystemServiceStatus | string;
}

export interface ConsultationRecord {
  id: string;
  patient_id: string;
  date: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticRecord {
  id: string;
  patient_id: string;
  date: string;
  diagnosis: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionRecord {
  id: string;
  patient_id: string;
  date: string;
  medication: string;
  dosage: string | null;
  instructions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentProcessingRunRecord {
  id: string;
  document_id: string;
  stage: string;
  status: string;
  engine_name: string | null;
  engine_version: string | null;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  confidence: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtractionResultRecord {
  id: string;
  document_id: string;
  version: number;
  predicted_document_type_code: string | null;
  schema_version: string | null;
  extracted_payload: Record<string, unknown>;
  confidence: number | null;
  created_from_run_id: string | null;
  is_validated: boolean;
  validation_flags: string[];
  created_at: string;
  updated_at: string;
}

export interface DocumentTypeRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface PatientConditionRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  document_id: string | null;
  episode_id: string | null;
  name: string;
  normalized_name: string;
  normalized_code: string | null;
  normalized_system: "LOCAL" | "ICD10" | "SNOMED";
  condition_type: "diagnosis" | "comorbidity" | "allergy" | "antecedent";
  status: "active" | "resolved" | "unknown";
  onset_date: string | null;
  recorded_at: string;
  confidence: number | null;
  source_text: string | null;
  is_chronic: boolean | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientsByDoctorRecord {
  doctor_id: string | null;
  doctor_name: string | null;
  total_count: number;
  active_count: number;
  deleted_count: number;
}

export interface IncomeByDoctorRecord {
  doctor_id: string | null;
  doctor_name: string | null;
  payments_count: number;
  total_income: DecimalValue;
}

export interface ExpensesByDoctorRecord {
  doctor_id: string | null;
  doctor_name: string | null;
  expenses_count: number;
  total_expenses: DecimalValue;
}

export interface InvoicesByStatusRecord {
  status: string;
  invoice_count: number;
  total_amount: DecimalValue;
}

export interface FinancialSummaryRowRecord {
  doctor_id: string | null;
  doctor_name: string | null;
  income_total: DecimalValue;
  expense_total: DecimalValue;
  net_total: DecimalValue;
}

export interface FinancialSummaryRecord {
  per_doctor: FinancialSummaryRowRecord[];
  global_summary: FinancialSummaryRowRecord;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecretaryRecord {
  id: string;
  doctor_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
