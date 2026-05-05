import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import Badge from "../../../components/common/Badge";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import type { PatientProfileResponse, ReconciliationRecord } from "../../../types/api";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from "../../../utils/format";
import {
  consultationsEndpoints,
  patientConditionsEndpoints,
  prescriptionsEndpoints,
  reconciliationEndpoints,
} from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import "./PatientProfile.css";

interface PatientProfileProps {
  profile: PatientProfileResponse | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

type PrescriptionStatus = "active" | "suspended" | "completed" | "discontinued";

const getStatusVariant = (
  status: string
): "success" | "warning" | "error" | "info" | "neutral" => {
  switch (status) {
    case "active":
    case "open":
    case "approved":
    case "applied":
    case "paid":
    case "ready":
    case "validated":
      return "success";
    case "deceased":
    case "manual_review":
    case "draft":
    case "pending":
    case "partially_paid":
    case "classified":
    case "extracted":
    case "suspended":
      return "warning";
    case "cancelled":
    case "rejected":
    case "failed":
    case "discontinued":
      return "error";
    case "completed":
      return "info";
    default:
      return "neutral";
  }
};

const getAge = (birthDate?: string | null) => {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) years -= 1;
  return `${years} años`;
};

const decisionLabels: Record<string, string> = {
  continue: "Continuar",
  suspend: "Suspender",
  substitute: "Sustituir",
  adjust_dose: "Ajustar dosis",
};

export default function PatientProfile({
  profile,
  isLoading,
  isError,
  onRetry,
}: PatientProfileProps) {
  const queryClient = useQueryClient();

  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState({ medication: "", dosage: "", instructions: "", start_date: "" });
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  const [showConditionForm, setShowConditionForm] = useState(false);
  const [condForm, setCondForm] = useState({
    name: "",
    condition_type: "diagnosis" as "diagnosis" | "comorbidity" | "allergy" | "antecedent",
    status: "active" as "active" | "resolved" | "unknown",
    is_chronic: false,
    normalized_code: "",
    normalized_system: "LOCAL" as "LOCAL" | "ICD10" | "SNOMED",
    onset_date: "",
  });
  const [condSubmitting, setCondSubmitting] = useState(false);
  const [condError, setCondError] = useState<string | null>(null);

  const [showConsultForm, setShowConsultForm] = useState(false);
  const [consultForm, setConsultForm] = useState({ reason: "", notes: "", date: "" });
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);

  const [prescriptionAction, setPrescriptionAction] = useState<string | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  const { data: reconciliations } = useQuery<ReconciliationRecord[]>({
    queryKey: ["reconciliations", profile?.patient.id],
    queryFn: () => reconciliationEndpoints.listForPatient(profile!.patient.id),
    enabled: !!profile?.patient.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!profile) return <Empty message="Selecciona un paciente" />;

  const { patient, active_conditions, active_prescriptions, recent_consultations, recent_documents, financial } = profile;

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["patient-profile", patient.id] });

  const handleAddPrescription = async () => {
    if (!rxForm.medication.trim()) { setRxError("Medicamento es requerido."); return; }
    setRxSubmitting(true);
    setRxError(null);
    try {
      await prescriptionsEndpoints.create({
        patient_id: patient.id,
        medication: rxForm.medication.trim(),
        dosage: rxForm.dosage.trim() || null,
        instructions: rxForm.instructions.trim() || null,
        start_date: rxForm.start_date || undefined,
      });
      setRxForm({ medication: "", dosage: "", instructions: "", start_date: "" });
      setShowRxForm(false);
      await invalidateProfile();
    } catch (err) {
      setRxError((err as ApiError).message || "No se pudo crear prescripción.");
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleAddCondition = async () => {
    if (!condForm.name.trim()) { setCondError("Nombre es requerido."); return; }
    setCondSubmitting(true);
    setCondError(null);
    try {
      await patientConditionsEndpoints.create({
        patient_id: patient.id,
        name: condForm.name.trim(),
        condition_type: condForm.condition_type,
        status: condForm.status,
        is_chronic: condForm.is_chronic,
        normalized_code: condForm.normalized_code.trim() || null,
        normalized_system: condForm.normalized_system,
        onset_date: condForm.onset_date || null,
      });
      setCondForm({ name: "", condition_type: "diagnosis", status: "active", is_chronic: false, normalized_code: "", normalized_system: "LOCAL", onset_date: "" });
      setShowConditionForm(false);
      await invalidateProfile();
    } catch (err) {
      setCondError((err as ApiError).message || "No se pudo crear condición.");
    } finally {
      setCondSubmitting(false);
    }
  };

  const handleAddConsultation = async () => {
    setConsultSubmitting(true);
    setConsultError(null);
    try {
      await consultationsEndpoints.create({
        patient_id: patient.id,
        date: consultForm.date || new Date().toISOString(),
        reason: consultForm.reason.trim() || null,
        notes: consultForm.notes.trim() || null,
      });
      setConsultForm({ reason: "", notes: "", date: "" });
      setShowConsultForm(false);
      await invalidateProfile();
    } catch (err) {
      setConsultError((err as ApiError).message || "No se pudo crear consulta.");
    } finally {
      setConsultSubmitting(false);
    }
  };

  const handlePrescriptionStatus = (prescriptionId: string, status: PrescriptionStatus) => {
    const run = async () => {
      setPrescriptionAction(prescriptionId + status);
      setPrescriptionError(null);
      try {
        await prescriptionsEndpoints.update(prescriptionId, { status });
        await invalidateProfile();
      } catch (err) {
        setPrescriptionError((err as ApiError).message || "No se pudo actualizar prescripción.");
      } finally {
        setPrescriptionAction(null);
      }
    };
    void run();
  };

  const conditionGroups = [
    { type: "diagnosis", label: "Diagnósticos" },
    { type: "comorbidity", label: "Comorbilidades" },
    { type: "allergy", label: "Alergias" },
    { type: "antecedent", label: "Antecedentes" },
  ].map((g) => ({
    ...g,
    items: active_conditions.filter((c) => c.condition_type === g.type),
  }));

  return (
    <div className="patient-profile">
      <section className="patient-profile-hero">
        <div className="patient-profile-header">
          <div className="patient-profile-title-section">
            <p className="patient-profile-kicker">Ficha del paciente</p>
            <h1 className="patient-profile-name">{patient.full_name}</h1>
            <div className="patient-profile-header-meta">
              <span>{patient.document_number}</span>
              <span>{patient.insurer_name || "Sin aseguradora"}</span>
              <span>{patient.doctor_name || "Sin doctor asignado"}</span>
            </div>
          </div>
          <div className="patient-profile-header-badges">
            <Badge variant={getStatusVariant(patient.status)}>{patient.status.toUpperCase()}</Badge>
            {patient.gender && <Badge variant="neutral">{patient.gender.toUpperCase()}</Badge>}
          </div>
        </div>

        <div className="patient-profile-stat-grid">
          <MetricCard label="Saldo pendiente" value={formatCurrency(parseFloat(financial.outstanding_balance))} tone="warning" />
          <MetricCard label="Facturas" value={String(financial.invoice_count)} tone="info" />
          <MetricCard label="Prescripciones activas" value={String(active_prescriptions.length)} tone="success" />
          <MetricCard label="Hallazgos clínicos" value={String(active_conditions.length)} tone="neutral" />
        </div>
      </section>

      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Resumen clínico y administrativo</h3>
        </div>
        <div className="patient-profile-grid">
          <InfoCard label="Documento" value={patient.document_number} mono />
          <InfoCard label="Nacimiento" value={patient.birth_date ? formatDate(patient.birth_date) : "—"} auxiliary={getAge(patient.birth_date)} />
          <InfoCard label="Teléfono principal" value={patient.phone || "—"} />
          <InfoCard label="Teléfono secundario" value={patient.secondary_phone || "—"} />
          <InfoCard label="Dirección" value={patient.address || "—"} />
          <InfoCard label="Aseguradora" value={patient.insurer_name || "—"} />
          <InfoCard label="Doctor asignado" value={patient.doctor_name || "—"} />
          <InfoCard label="Última actualización" value={formatDate(patient.updated_at)} auxiliary={formatRelativeTime(patient.updated_at)} />
        </div>
      </section>

      {/* ── HISTORIAL MÉDICO ─────────────────────────── */}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Historial médico</h3>
          <button className="patient-profile-add-btn" onClick={() => { setShowConditionForm((v) => !v); setCondError(null); }} type="button">
            {showConditionForm ? <X size={14} /> : <Plus size={14} />}
            {showConditionForm ? "Cancelar" : "Agregar condición"}
          </button>
        </div>

        {showConditionForm && (
          <div className="patient-profile-inline-form">
            <div className="patient-profile-form-row">
              <label>
                Nombre *
                <input
                  className="patient-profile-form-input"
                  value={condForm.name}
                  onChange={(e) => setCondForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Hipertensión arterial"
                />
              </label>
              <label>
                Tipo
                <select
                  className="patient-profile-form-select"
                  value={condForm.condition_type}
                  onChange={(e) => setCondForm((f) => ({ ...f, condition_type: e.target.value as typeof condForm.condition_type }))}
                >
                  <option value="diagnosis">Diagnóstico</option>
                  <option value="comorbidity">Comorbilidad</option>
                  <option value="allergy">Alergia</option>
                  <option value="antecedent">Antecedente</option>
                </select>
              </label>
              <label>
                Estado
                <select
                  className="patient-profile-form-select"
                  value={condForm.status}
                  onChange={(e) => setCondForm((f) => ({ ...f, status: e.target.value as typeof condForm.status }))}
                >
                  <option value="active">Activo</option>
                  <option value="resolved">Resuelto</option>
                  <option value="unknown">Desconocido</option>
                </select>
              </label>
            </div>
            <div className="patient-profile-form-row">
              <label>
                Código (ICD10, SNOMED, etc.)
                <input
                  className="patient-profile-form-input"
                  value={condForm.normalized_code}
                  onChange={(e) => setCondForm((f) => ({ ...f, normalized_code: e.target.value }))}
                  placeholder="Ej: I10"
                />
              </label>
              <label>
                Sistema
                <select
                  className="patient-profile-form-select"
                  value={condForm.normalized_system}
                  onChange={(e) => setCondForm((f) => ({ ...f, normalized_system: e.target.value as typeof condForm.normalized_system }))}
                >
                  <option value="LOCAL">LOCAL</option>
                  <option value="ICD10">ICD10</option>
                  <option value="SNOMED">SNOMED</option>
                </select>
              </label>
              <label>
                Fecha de inicio
                <input
                  className="patient-profile-form-input"
                  type="date"
                  value={condForm.onset_date}
                  onChange={(e) => setCondForm((f) => ({ ...f, onset_date: e.target.value }))}
                />
              </label>
            </div>
            <label className="patient-profile-form-check">
              <input
                type="checkbox"
                checked={condForm.is_chronic}
                onChange={(e) => setCondForm((f) => ({ ...f, is_chronic: e.target.checked }))}
              />
              Condición crónica
            </label>
            {condError && <p className="patient-profile-form-error">{condError}</p>}
            <div className="patient-profile-form-actions">
              <button className="patient-profile-form-submit" onClick={() => void handleAddCondition()} disabled={condSubmitting} type="button">
                {condSubmitting ? "Guardando..." : "Guardar condición"}
              </button>
            </div>
          </div>
        )}

        {!active_conditions.length && !showConditionForm ? (
          <div className="patient-profile-empty-panel">Todavía no hay enfermedades, alergias o antecedentes registrados.</div>
        ) : (
          <div className="patient-profile-condition-groups">
            {conditionGroups.filter((g) => g.items.length > 0).map((g) => (
              <div key={g.type} className="patient-profile-panel">
                <div className="patient-profile-panel-head">
                  <strong>{g.label}</strong>
                  <Badge variant="info">{g.items.length}</Badge>
                </div>
                <div className="patient-profile-chip-list">
                  {g.items.map((condition) => (
                    <div key={condition.id} className="patient-profile-chip">
                      <div className="patient-profile-chip-main">
                        <strong>{condition.name}</strong>
                        <div className="patient-profile-chip-badges">
                          <Badge variant={getStatusVariant(condition.status)}>{condition.status}</Badge>
                          <Badge variant="neutral">{condition.normalized_system}</Badge>
                          {condition.normalized_code && <Badge variant="info">{condition.normalized_code}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── MEDICACIÓN ACTIVA ────────────────────────── */}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Medicación activa</h3>
          <button className="patient-profile-add-btn" onClick={() => { setShowRxForm((v) => !v); setRxError(null); }} type="button">
            {showRxForm ? <X size={14} /> : <Plus size={14} />}
            {showRxForm ? "Cancelar" : "Nueva prescripción"}
          </button>
        </div>

        {showRxForm && (
          <div className="patient-profile-inline-form">
            <div className="patient-profile-form-row">
              <label>
                Medicamento *
                <input
                  className="patient-profile-form-input"
                  value={rxForm.medication}
                  onChange={(e) => setRxForm((f) => ({ ...f, medication: e.target.value }))}
                  placeholder="Ej: Furosemida"
                />
              </label>
              <label>
                Dosis
                <input
                  className="patient-profile-form-input"
                  value={rxForm.dosage}
                  onChange={(e) => setRxForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="Ej: 40mg"
                />
              </label>
              <label>
                Fecha de inicio
                <input
                  className="patient-profile-form-input"
                  type="date"
                  value={rxForm.start_date}
                  onChange={(e) => setRxForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </label>
            </div>
            <label>
              Instrucciones
              <input
                className="patient-profile-form-input"
                value={rxForm.instructions}
                onChange={(e) => setRxForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="Ej: 1 comprimido en ayunas"
              />
            </label>
            {rxError && <p className="patient-profile-form-error">{rxError}</p>}
            <div className="patient-profile-form-actions">
              <button className="patient-profile-form-submit" onClick={() => void handleAddPrescription()} disabled={rxSubmitting} type="button">
                {rxSubmitting ? "Guardando..." : "Guardar prescripción"}
              </button>
            </div>
          </div>
        )}

        {prescriptionError && <p className="patient-profile-prescription-error">{prescriptionError}</p>}

        {!active_prescriptions.length && !showRxForm ? (
          <div className="patient-profile-empty-panel">Sin prescripciones activas registradas.</div>
        ) : (
          <div className="patient-profile-prescription-list">
            {active_prescriptions.map((rx) => (
              <div key={rx.id} className="patient-profile-prescription-card">
                <div className="patient-profile-prescription-info">
                  <strong>{rx.medication}</strong>
                  {rx.dosage && <span className="patient-profile-prescription-dosage">{rx.dosage}</span>}
                  {rx.instructions && <span className="patient-profile-prescription-instructions">{rx.instructions}</span>}
                  {rx.start_date && <span className="patient-profile-prescription-meta">Inicio: {formatDate(rx.start_date)}</span>}
                </div>
                <div className="patient-profile-prescription-actions">
                  <Badge variant={getStatusVariant(rx.status)}>{rx.status}</Badge>
                  {rx.status === "active" && (
                    <>
                      <button className="patient-profile-rx-btn warning" disabled={prescriptionAction !== null} onClick={() => handlePrescriptionStatus(rx.id, "suspended")} type="button">
                        {prescriptionAction === rx.id + "suspended" ? "..." : "Suspender"}
                      </button>
                      <button className="patient-profile-rx-btn info" disabled={prescriptionAction !== null} onClick={() => handlePrescriptionStatus(rx.id, "completed")} type="button">
                        {prescriptionAction === rx.id + "completed" ? "..." : "Completar"}
                      </button>
                      <button className="patient-profile-rx-btn error" disabled={prescriptionAction !== null} onClick={() => handlePrescriptionStatus(rx.id, "discontinued")} type="button">
                        {prescriptionAction === rx.id + "discontinued" ? "..." : "Descontinuar"}
                      </button>
                    </>
                  )}
                  {rx.status === "suspended" && (
                    <button className="patient-profile-rx-btn success" disabled={prescriptionAction !== null} onClick={() => handlePrescriptionStatus(rx.id, "active")} type="button">
                      {prescriptionAction === rx.id + "active" ? "..." : "Reactivar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CONSULTAS ────────────────────────────────── */}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Consultas</h3>
          <button className="patient-profile-add-btn" onClick={() => { setShowConsultForm((v) => !v); setConsultError(null); }} type="button">
            {showConsultForm ? <X size={14} /> : <Plus size={14} />}
            {showConsultForm ? "Cancelar" : "Nueva consulta"}
          </button>
        </div>

        {showConsultForm && (
          <div className="patient-profile-inline-form">
            <div className="patient-profile-form-row">
              <label>
                Motivo
                <input
                  className="patient-profile-form-input"
                  value={consultForm.reason}
                  onChange={(e) => setConsultForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Ej: Control mensual"
                />
              </label>
              <label>
                Fecha
                <input
                  className="patient-profile-form-input"
                  type="datetime-local"
                  value={consultForm.date}
                  onChange={(e) => setConsultForm((f) => ({ ...f, date: e.target.value }))}
                />
              </label>
            </div>
            <label>
              Notas clínicas
              <textarea
                className="patient-profile-form-textarea"
                rows={3}
                value={consultForm.notes}
                onChange={(e) => setConsultForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones de la consulta..."
              />
            </label>
            {consultError && <p className="patient-profile-form-error">{consultError}</p>}
            <div className="patient-profile-form-actions">
              <button className="patient-profile-form-submit" onClick={() => void handleAddConsultation()} disabled={consultSubmitting} type="button">
                {consultSubmitting ? "Guardando..." : "Guardar consulta"}
              </button>
            </div>
          </div>
        )}

        {!recent_consultations.length && !showConsultForm ? (
          <div className="patient-profile-empty-panel">Sin consultas registradas.</div>
        ) : (
          <div className="patient-profile-activity-list">
            {recent_consultations.map((c) => (
              <ActivityItem
                key={c.id}
                title={c.reason || "Consulta"}
                subtitle={c.notes || "—"}
                meta={formatDateTime(c.consultation_date)}
                badges={[]}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── RECONCILIACIONES ─────────────────────────── */}
      {reconciliations && reconciliations.length > 0 && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Reconciliaciones de medicación</h3>
            <span>{reconciliations.length} actas</span>
          </div>
          <div className="patient-profile-reconciliation-list">
            {reconciliations.map((rec) => (
              <div key={rec.id} className="patient-profile-panel">
                <div className="patient-profile-panel-head">
                  <strong>{formatDateTime(rec.reconciled_at)}</strong>
                  <Badge variant="info">{rec.items.length} medicamentos</Badge>
                </div>
                {rec.notes && <p className="patient-profile-reconciliation-notes">{rec.notes}</p>}
                <div className="patient-profile-chip-list">
                  {rec.items.map((item, idx) => (
                    <div key={idx} className="patient-profile-chip">
                      <div className="patient-profile-chip-main">
                        <strong>{item.medication}</strong>
                        <div className="patient-profile-chip-badges">
                          <Badge variant="info">{decisionLabels[item.decision] || item.decision}</Badge>
                          {item.new_dosage && <Badge variant="neutral">{item.new_dosage}</Badge>}
                        </div>
                      </div>
                      {item.clinical_justification && (
                        <span className="patient-profile-chip-meta">{item.clinical_justification}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FINANZAS ─────────────────────────────────── */}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Finanzas del paciente</h3>
          <span>{financial.payment_count} pagos recibidos</span>
        </div>
        <div className="patient-profile-financial-grid">
          <FinancialMetric label="Total facturado" value={formatCurrency(parseFloat(financial.total_invoiced))} />
          <FinancialMetric label="Total pagado" value={formatCurrency(parseFloat(financial.total_paid))} tone="success" />
          <FinancialMetric label="Saldo pendiente" value={formatCurrency(parseFloat(financial.outstanding_balance))} tone="warning" />
          <FinancialMetric label="Gastos del paciente" value={formatCurrency(parseFloat(financial.total_expenses))} />
          <FinancialMetric label="Margen neto" value={formatCurrency(parseFloat(financial.net_margin))} tone="success" />
        </div>
      </section>

      {/* ── DOCUMENTOS RECIENTES ─────────────────────── */}
      {recent_documents.length > 0 && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Documentos recientes</h3>
            <span>{recent_documents.length} documentos</span>
          </div>
          <div className="patient-profile-activity-list">
            {recent_documents.map((doc) => (
              <ActivityItem
                key={doc.id}
                title={doc.title}
                subtitle={doc.review_required ? "Requiere revisión de extracción IA" : doc.application_status}
                meta={formatDateTime(doc.created_at)}
                badges={[
                  { label: doc.processing_status, variant: getStatusVariant(doc.processing_status) },
                  { label: doc.application_status, variant: getStatusVariant(doc.application_status) },
                  ...(doc.review_required ? [{ label: "Revisión IA", variant: "warning" as const }] : []),
                ]}
              />
            ))}
          </div>
        </section>
      )}

      {patient.notes && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Notas del expediente</h3>
          </div>
          <div className="patient-profile-notes">{patient.notes}</div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "success" | "warning" | "info" | "neutral" }) {
  return (
    <div className={`patient-profile-metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FinancialMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "success" | "warning" | "neutral" }) {
  return (
    <div className={`patient-profile-financial-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoCard({ label, value, auxiliary, mono = false }: { label: string; value: string; auxiliary?: string; mono?: boolean }) {
  return (
    <div className="patient-profile-info-card">
      <span className="label">{label}</span>
      <strong className={mono ? "mono" : ""}>{value}</strong>
      {auxiliary && <span className="auxiliary">{auxiliary}</span>}
    </div>
  );
}

function ActivityPanel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="patient-profile-panel">
      <div className="patient-profile-panel-head">
        <strong>{title}</strong>
        <Badge variant="neutral">{count}</Badge>
      </div>
      <div className="patient-profile-activity-list">{children}</div>
    </div>
  );
}

// keep exported for potential future use
export { ActivityPanel };

function ActivityItem({ title, subtitle, meta, badges }: { title: string; subtitle: string; meta: string; badges: Array<{ label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> }) {
  return (
    <div className="patient-profile-activity-item">
      <div className="patient-profile-activity-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <small>{meta}</small>
      </div>
      <div className="patient-profile-activity-badges">
        {badges.map((badge) => (
          <Badge key={`${title}-${badge.label}`} variant={badge.variant}>{badge.label}</Badge>
        ))}
      </div>
    </div>
  );
}
