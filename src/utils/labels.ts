/**
 * Single source of Spanish labels for every enum the API returns.
 * Never render a raw enum value: use `label("patientStatus", p.status)` (unknown values
 * fall back to a humanized string, never to the English key).
 */
const MAPS = {
  patientStatus: { active: "Activo", inactive: "Inactivo", deceased: "Fallecido" },
  sex: { female: "Femenino", male: "Masculino", other: "Otro", unknown: "Sin dato" },
  sexShort: { female: "F", male: "M", other: "Otro", unknown: "—" },
  role: { admin: "Administrador", doctor: "Médico", secretary: "Secretaria" },
  staffType: { doctor: "Médico", secretary: "Secretaria" },
  activeFlag: { true: "Activo", false: "Inactivo" },
  consultationStatus: { draft: "Borrador", signed: "Firmada", amended: "Firmada con enmiendas" },
  episodeStatus: { open: "Abierto", closed: "Cerrado", cancelled: "Cancelado" },
  invoiceStatus: { draft: "Borrador", issued: "Emitida", partially_paid: "Pago parcial", paid: "Pagada", cancelled: "Anulada", overdue: "Vencida" },
  prescriptionStatus: { active: "Activa", suspended: "Suspendida", completed: "Completada", discontinued: "Descontinuada" },
  conditionStatus: { active: "Activa", resolved: "Resuelta", unknown: "Sin dato" },
  conditionType: { diagnosis: "Diagnóstico", comorbidity: "Comorbilidad", allergy: "Alergia", antecedent: "Antecedente" },
  codeSystem: { LOCAL: "Texto libre", ICD10: "CIE-10", SNOMED: "SNOMED" },
  documentProcessing: {
    uploaded: "Subido", pending: "Pendiente", processing: "Procesando", classified: "Clasificado", extracted: "Datos extraídos",
    validated: "Validado", ready: "Listo", done: "Procesado", failed: "Error", manual_review: "Revisión manual",
  },
  documentReview: { pending: "Por revisar", approved: "Aprobado", rejected: "Rechazado", manual_review: "Revisión manual", not_required: "Sin revisión" },
  documentType: { clinical_report: "Informe clínico", lab_result: "Laboratorio", imaging: "Imagen", prescription: "Receta", invoice: "Factura", identity: "Identificación", other: "Otro" },
  documentTraceStatus: { linked: "Vinculado", created_new: "Paciente nuevo", matched_existing: "Paciente existente", skipped: "Omitido", error: "Error", requested: "Solicitado" },
  documentApplication: { pending: "Sin aplicar", applied: "Aplicado", not_applied: "Sin aplicar", partially_applied: "Aplicado en parte", failed: "Error al aplicar" },
  paymentMethod: { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", check: "Cheque", insurance: "Aseguradora", other: "Otro" },
  payerType: { patient: "Paciente", insurer: "Aseguradora", other: "Otro" },
  severity: { alert: "Alerta", watch: "Vigilar", info: "Info" },
  systemStatus: { ok: "Operativo", degraded: "Degradado", down: "Caído", unknown: "Sin dato" },
  auditAction: {
    login: "Inicio de sesión", refresh: "Renovación de sesión", create: "Creación", update: "Edición", delete: "Eliminación",
    upload: "Carga de documento", process: "Procesamiento", approve: "Aprobación", apply: "Aplicación", reject: "Rechazo",
    "staff.create": "Alta de usuario", "staff.update": "Cambio de usuario", "staff.reset_password": "Restablecer contraseña",
    "consultation.sign": "Nota firmada", "consultation.amend": "Enmienda", "consultation.transcribe": "Transcripción",
    "ai_suggestion.create": "Sugerencia de IA", "ai_suggestion.accept": "IA aceptada", "ai_suggestion.reject": "IA descartada", "ai_suggestion.apply": "IA aplicada",
  },
  entityType: {
    patient: "Paciente", consultation: "Consulta", consultation_diagnosis: "Diagnóstico", invoice: "Factura", payment: "Pago",
    expense: "Gasto", document: "Documento", episode: "Episodio", doctor: "Médico", secretary: "Secretaria", user: "Usuario",
    prescription: "Prescripción", patient_condition: "Condición", ai_suggestion: "Sugerencia de IA",
    auth: "Sesión", invoice_item: "Ítem de factura", staff: "Equipo", diagnostic: "Diagnóstico",
  },
  ageGroup: { "0-17": "0-17 años", "18-39": "18-39 años", "40-59": "40-59 años", "60-74": "60-74 años", "75+": "75+ años", unknown: "Sin dato" },
  soapSection: {
    chief_complaint: "Motivo de consulta", history_present_illness: "Enfermedad actual", past_history: "Antecedentes",
    physical_exam: "Examen físico", assessment: "Evaluación", plan: "Plan",
  },
} as const;

export type LabelKind = keyof typeof MAPS;

const humanize = (v: string) => {
  const s = v.replace(/[_.-]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "—";
};

/** Spanish label for an enum value. Unknown values are humanized, never shown as raw keys. */
export function label(kind: LabelKind, value: string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const map = MAPS[kind] as Record<string, string>;
  return map[String(value)] ?? humanize(String(value));
}

/** "1 paciente" / "3 pacientes" without "paciente(s)". */
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString("es-DO")} ${n === 1 ? one : many}`;

/** Whole-years age from an ISO birth date, or null. */
export function ageFrom(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let y = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) y -= 1;
  return y;
}
