import { httpClient } from "../services/http";
import { getPermissionsForRole, type AuthSession } from "../services/auth";
import { clinicalMock, notFound } from "./mockClinical";
import type { PatientRecord, DoctorRecord, EpisodeRecord, InvoiceRecord, DocumentRecord, PatientProfileResponse } from "../types/api";

const stamp = "2026-10-02T14:30:00-04:00";
const worst = new URLSearchParams(location.search).get("data") === "worst";
const mode = new URLSearchParams(location.search).get("data") || "demo";
const longName = "María de los Ángeles Fernanda de la Santísima Trinidad Fernández de Córdoba";
const longEmail = "maria.fernandez.coordinacion-paliativa@unidad-de-atencion-integral.example.com";
const role = (["admin", "doctor", "secretary"] as const).find((r) => r === new URLSearchParams(location.search).get("role")) ?? "admin";
export const previewSession: AuthSession = {
  user: { id: "preview-user", name: worst ? longName : "Dra. Lucía Mendoza", email: longEmail, role, doctorId: "doctor-1", isActive: true, createdAt: stamp },
  permissions: getPermissionsForRole(role),
};
const doctors: DoctorRecord[] = [
  { id: "doctor-1", first_name: "Lucía", last_name: "Mendoza", full_name: "Dra. Lucía Mendoza", specialty: "Medicina paliativa", license_number: "MED-2048", email: longEmail, phone: "+591 70123456", is_active: true },
  { id: "doctor-2", first_name: "Andrés", last_name: "Medina", full_name: "Dr. Andrés Medina", specialty: "Oncología", license_number: "MED-2049", email: "andres.medina@example.com", phone: "+591 70123457", is_active: true },
  { id: "doctor-3", first_name: "Paula", last_name: "Castillo", full_name: "Dra. Paula Castillo", specialty: "Medicina interna", license_number: "MED-2050", email: "paula.castillo@example.com", phone: "+591 70123458", is_active: true },
];
const names = worst ? [longName, "J", "Đặng Thị Ngọc Hân", "王小明", "Ana María Pérez Al-Rashid", "José Luis Gutiérrez"] : ["Elena Rodríguez", "Carlos Mendoza", "Ana María Pérez", "José Luis Gutiérrez", "Teresa Almonte Reyes", "Rosa Santos Núñez", "Juan Díaz Herrera"];
const count = mode === "empty" ? 0 : mode === "one" ? 1 : mode === "huge" ? 1000 : names.length;
const patients: PatientRecord[] = Array.from({length: count}, (_, i) => ({
  id: `patient-${i+1}`, doctor_id: "doctor-1", created_by_user_id: "preview-user", first_name: names[i % names.length].split(" ")[0], last_name: "Rodríguez", full_name: names[i % names.length],
  document_number: `CI-${8024500+i}`, birth_date: "1954-04-12", gender: i % 2 ? "male" : "female", phone: "+591 70123456", secondary_phone: i % 2 ? null : "+591 71234567",
  address: worst ? "Avenida de la Integración Latinoamericana, edificio Los Cedros, departamento 1204, La Paz" : "Av. Arce 2147, La Paz", insurer_name: "Caja Nacional de Salud", status: i === 2 ? "inactive" : "active", notes: "Seguimiento domiciliario. Contactar a la familia antes de la próxima visita.", is_active: true, created_at: stamp, updated_at: stamp,
}));
const episodes: EpisodeRecord[] = patients.slice(0,4).map((p,i) => ({ id: `episode-${i+1}`, patient_id: p.id, doctor_id: "doctor-1", episode_type: "Atención domiciliaria", start_date: stamp, end_date: i ? stamp : null, diagnosis: "Seguimiento integral y acompañamiento familiar", insurer_name: p.insurer_name, notes: "Control programado con el equipo de atención.", status: i ? "closed" : "open", created_at: stamp, updated_at: stamp }));
const amount = worst ? 12345678.9 : 1250;
// Varied issue dates so "Vencidas (+30 días)" has data: 74 and 45 days ago are overdue.
const invoiceDate = (i: number) => new Date(Date.now() - [74, 45, 20, 3][i % 4] * 86400000).toISOString();
const invoices: InvoiceRecord[] = patients.slice(0,4).map((p,i) => ({ id: `invoice-${i+1}`, patient_id: p.id, doctor_id: "doctor-1", episode_id: episodes[i].id, created_by_user_id: "preview-user", invoice_number: `FAC-2026-00${i+1}`, issue_date: invoiceDate(i), insurer_name: p.insurer_name, subtotal: amount, discounts: 0, total: amount, insurer_expected_amount: amount*.8, patient_expected_amount: amount*.2, status: (["issued", "partially_paid", "paid", "issued"] as const)[i % 4], notes: "Atención y seguimiento domiciliario", items_snapshot: [{ item_id: "item-1", description: "Consulta de seguimiento domiciliario", quantity: 1, unit_price: amount, subtotal: amount, insurer_covered_amount: amount*.8, patient_amount: amount*.2 }], created_at: stamp, updated_at: stamp }));
const payments = invoices.map((v,i) => ({id: `payment-${i+1}`, invoice_id: v.id, patient_id: v.patient_id, doctor_id: "doctor-1", payer_type: "patient", amount: i === 0 ? 250 : i === 1 ? amount / 2 : amount, payment_date: stamp, payment_method: "transfer", reference: "TR-2048", notes: null, created_at: stamp, updated_at: stamp}));
const expenses = mode === "empty" ? [] : [{id: "expense-1", doctor_id: "doctor-1", patient_id: "patient-1", description: "Material de atención domiciliaria", category: "Insumos", amount: 480, expense_date: stamp, created_by_user_id: "preview-user", notes: null, created_at: stamp, updated_at: stamp}];
const documents: DocumentRecord[] = patients.slice(0,3).map((p,i) => ({ id: `document-${i+1}`, patient_id: p.id, episode_id: null, doctor_id: "doctor-1", document_type_id: "type-1", declared_document_type_id: "type-1", title: worst ? "Informe de seguimiento multidisciplinario y coordinación de cuidados domiciliarios — revisión de octubre" : "Informe de seguimiento", file_name: "informe-seguimiento-octubre.pdf", file_path: null, mime_type: "application/pdf", storage_provider: "preview", processing_status: "extracted", predicted_document_type_code: "clinical_report", classification_confidence: .96, classification_method: "llm", classifier_version: "preview", validation_flags: [], review_status: i ? "approved" : "pending", review_required: !i, review_trigger_reasons: [], application_status: "pending", current_extraction_result_id: `extraction-${i+1}`, matched_patient_id: p.id, processed_at: stamp, applied_at: null, file_hash: null, page_count: 2, storage_bucket: null, storage_object_key: null, storage_etag: null, metadata: null, created_by_user_id: "preview-user", created_at: stamp, updated_at: stamp }));
const secretaries = mode === "empty" ? [] : [{id: "secretary-1", doctor_id: "doctor-1", first_name: "María", last_name: "Fernández", full_name: worst ? longName : "María Fernández", phone: "+591 70123456", email: worst ? longEmail : "maria.fernandez@example.com", notes: null, is_active: true, created_at: stamp, updated_at: stamp}];
const audit = mode === "empty" ? [] : [{id: "audit-1", user_id: "preview-user", action: "update", entity_type: "patient", entity_id: "patient-1", before: null, after: {full_name: patients[0]?.full_name, status: "active", insurer_name: "Caja Nacional de Salud"}, ip: "192.0.2.1", created_at: stamp, updated_at: stamp}];
const conditions = [{id: "condition-allergy", name: "Alergia a AINEs", condition_type: "allergy", status: "active", is_chronic: false, normalized_code: null, normalized_system: "LOCAL", onset_date: null, recorded_at: stamp}, {id: "condition-1", name: "Hipertensión arterial", condition_type: "comorbidity", status: "active", is_chronic: true, normalized_code: "I10", normalized_system: "ICD10", onset_date: "2020-01-01", recorded_at: stamp}];
const prescriptions = [{id: "prescription-1", medication: "Tratamiento registrado de demostración", dosage: null, instructions: "Ejemplo visual sin indicación terapéutica.", status: "active" as const, start_date: stamp, end_date: null, prescription_date: stamp}];
const consultations = [{id: "consultation-1", consultation_date: stamp, reason: "Control de síntomas y bienestar", notes: "Acompañamiento a la paciente y su familia."}];
const profile = (id: string): PatientProfileResponse => ({patient: {...(patients.find(p=>p.id===id) || patients[0]), doctor_name: doctors[0].full_name}, active_conditions: conditions, active_prescriptions: prescriptions, recent_consultations: consultations, recent_documents: documents, recent_events: [], financial: { total_invoiced: String(amount), total_paid: "250", outstanding_balance: String(amount-250), total_expenses: "480", net_margin: String(amount-480), invoice_count: 1, payment_count: 1 }});
const summary = {doctor_id: "doctor-1", doctor_name: doctors[0].full_name, invoiced_total: amount, income_total: amount, expense_total: 480, net_total: amount-480};
const collections: Record<string, unknown[]> = { patients, doctors, episodes, invoices, payments, expenses, documents, secretaries, audit, "document-types": [{id: "type-1", code: "clinical_report", name: "Informe clínico", description: null, is_active: true}] };

/** Development only: intercept at the transport boundary. No request reaches a backend. */
export function installPreview() {
  httpClient.defaults.adapter = async config => {
    const path = (config.url || "").split("?")[0];
    const parts = path.split("/").filter(Boolean);
    let data: unknown;
    const method = (config.method || "get").toLowerCase();
    const query = Object.fromEntries(Object.entries({ ...Object.fromEntries(new URLSearchParams((config.url || "").split("?")[1] || "")), ...(config.params instanceof URLSearchParams ? Object.fromEntries(config.params) : config.params || {}) }).map(([k, v]) => [k, v === undefined ? undefined : String(v)]));
    const body = typeof config.data === "string" ? (() => { try { return JSON.parse(config.data); } catch { return {}; } })()
      : config.data instanceof FormData ? Object.fromEntries(config.data.entries()) : (config.data || {});
    // Multipart uploads (audio transcription): report upload progress like the browser would.
    if (config.data instanceof FormData && config.onUploadProgress) {
      const file = config.data.get("file");
      const total = file instanceof Blob ? Math.max(file.size, 1) : 1;
      for (const step of [.25, .5, .75, 1]) {
        await new Promise((r) => setTimeout(r, 140));
        config.onUploadProgress({ loaded: Math.round(total * step), total, progress: step, bytes: Math.round(total * .25), lengthComputable: true } as never);
      }
    }
    let clinical: unknown;
    try { clinical = clinicalMock(method, path, query, body); }
    catch (e) {
      const status = (e as {status?: number}).status;
      if (!status) throw e;
      // Same envelope as the backend so the http interceptor maps it.
      const code = (e as {code?: string}).code ?? (status === 409 ? "CONFLICT" : "BAD_REQUEST");
      throw {response: {status, data: {error: {code, message: (e as Error).message}}}};
    }
    if (clinical !== notFound) {
      if (clinical === undefined) throw new Error(`Mock sin fixture: ${path}`);
      await new Promise((r) => setTimeout(r, path.endsWith("/transcribe") ? 900 : path.startsWith("/ai/") ? 420 : 80));
      return {data: clinical, status: 200, statusText: "OK", headers: {}, config};
    }
    if (config.method !== "get") throw new Error("Previsualización: las modificaciones no se guardan.");
    if (path.endsWith("/profile")) data = profile(parts[1]);
    else if (path.endsWith("/reconciliations")) data = [];
    else if (path.endsWith("/extractions")) data = [{id: "extraction-1", document_id: parts[1], version: 1, predicted_document_type_code: "clinical_report", schema_version: "1", extracted_payload: {patient: {full_name: patients[0]?.full_name}, summary: "Control de seguimiento"}, per_field_confidence: {}, confidence: .96, is_validated: false, validated_payload: null, validation_flags: [], created_at: stamp, updated_at: stamp}];
    else if (path.endsWith("/meta")) data = documents.find(d=>d.id===parts[1]);
    else if (path === "/system/status") data = {backend: "ok", database: "ok", minio: "ok", llm: "ok"};
    else if (parts[0] === "reports") {
      const reports: Record<string,unknown> = {
        "financial-summary": {per_doctor: [summary], global_summary: summary},
        "patients-by-doctor": [{doctor_id: "doctor-1", doctor_name: doctors[0].full_name, total_count: count, active_count: count, deleted_count: 0}],
        "income-by-doctor": [{doctor_id: "doctor-1", doctor_name: doctors[0].full_name, payments_count: payments.length, total_income: amount}],
        "expenses-by-doctor": [{doctor_id: "doctor-1", doctor_name: doctors[0].full_name, expenses_count: 1, total_expenses: 480}],
        "invoices-by-status": [{status: "issued", invoice_count: invoices.length, total_amount: amount}],
      };
      data = reports[parts[1]];
    } else {
      const collection = collections[parts[0]];
      if (!collection) throw new Error(`Mock sin fixture: ${path}`);
      if (parts.length > 1) data = collection.find(item => (item as {id:string}).id === parts[1]);
      else { const size = Number(config.params?.page_size || 100); data = {items: collection.slice(0,size), total: collection.length, page: 1, page_size: size, total_pages: Math.ceil(collection.length/size)}; }
    }
    if (data === undefined) throw new Error(`Mock sin fixture: ${path}`);
    return {data, status: 200, statusText: "OK", headers: {}, config};
  };
}
