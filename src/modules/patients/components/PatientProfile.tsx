import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import SegmentedControl from "../../../components/common/SegmentedControl";
import ActionMenu from "../../../components/common/ActionMenu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FilePlus2, Plus, Receipt, X } from "lucide-react";
import Button from "../../../components/common/Button";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import CodePill from "../../../components/clinical/CodePill";
import InlineState from "../../../components/clinical/InlineState";
import { SeverityBadge, usePatientAlerts } from "../../../components/clinical/alerts";
import { ageFrom, label } from "../../../utils/labels";
import Pill from "../../../components/common/Pill";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import type { PatientProfileResponse, ReconciliationRecord } from "../../../types/api";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from "../../../utils/format";
import {
  episodesEndpoints,
  patientConditionsEndpoints,
  prescriptionsEndpoints,
  reconciliationEndpoints,
} from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import { usePermission } from "../../../utils/usePermission";
import PatientAiSummary, { useAiPatientSummary } from "./PatientAiSummary";
import PatientTimeline from "./PatientTimeline";
import PatientConsultations from "./PatientConsultations";
import "./PatientProfile.css";

interface PatientProfileProps {
  profile: PatientProfileResponse | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Primary action bar, shown right under the patient's name. */
  headerActions?: ReactNode;
  /** Inline forms opened from the action bar. */
  headerExtra?: ReactNode;
  /** Controlled section (lives in the URL as ?tab=). */
  tab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export type ProfileTab = "summary" | "history" | "consults" | "documents" | "finance";
export const PROFILE_TABS: ProfileTab[] = ["summary", "history", "consults", "documents", "finance"];

type PrescriptionStatus = "active" | "suspended" | "completed" | "discontinued";

const getStatusVariant = (
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" => {
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
      return "danger";
    case "completed":
      return "info";
    default:
      return "neutral";
  }
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
  headerActions,
  headerExtra,
  tab,
  onTabChange: setTab,
}: PatientProfileProps) {
  const navigate = useNavigate();
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const compact = useIsCompact();
  const canClinical = usePermission("clinical:read");
  const canAi = usePermission("ai:use");
  const patientId = profile?.patient.id;
  const alerts = usePatientAlerts(patientId);
  const aiSummary = useAiPatientSummary(patientId ?? "", !!patientId && canClinical && canAi);
  const { data: episodes = [] } = useQuery({
    queryKey: ["patient-episodes", patientId],
    queryFn: async () => (await episodesEndpoints.list(1, 100)).items.filter((e) => e.patient_id === patientId),
    enabled: !!patientId && tab === "history",
    staleTime: 5 * 60 * 1000,
  });
  const queryClient = useQueryClient();

  const [showRxForm, setShowRxForm] = useState(false);
  const [rxForm, setRxForm] = useState({ medication: "", dosage: "", instructions: "", start_date: "" });
  const [rxSubmitting, setRxSubmitting] = useState(false);

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

  const [prescriptionAction, setPrescriptionAction] = useState<string | null>(null);

  const { data: reconciliations } = useQuery<ReconciliationRecord[]>({
    queryKey: ["reconciliations", profile?.patient.id],
    queryFn: () => reconciliationEndpoints.listForPatient(profile!.patient.id),
    enabled: !!profile?.patient.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!profile) return <Empty message="Elige un paciente de la lista para ver su ficha clínica y empezar una Nueva consulta." />;

  const { patient, active_conditions, active_prescriptions, recent_consultations, recent_documents, financial } = profile;
  const age = ageFrom(patient.birth_date);
  // Active diagnoses: structured CIE-10 from the AI summary (DB-derived), else coded conditions of the profile.
  const activeDx: Array<{ code: string; description: string }> = aiSummary.data?.active_conditions.length
    ? aiSummary.data.active_conditions.map((c) => ({ code: c.code, description: c.description }))
    : active_conditions.filter((c) => c.normalized_system === "ICD10" && c.normalized_code && (c.condition_type === "diagnosis" || c.condition_type === "comorbidity"))
      .map((c) => ({ code: c.normalized_code!, description: c.name }));
  const dxLoading = aiSummary.isLoading && aiSummary.fetchStatus !== "idle";
  const allergies = active_conditions.filter((c) => c.condition_type === "allergy").map((c) => c.name);

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["patient-profile", patient.id] });

  const handleAddPrescription = async () => {
    if (!rxForm.medication.trim()) { toast.error("Medicamento es requerido."); return; }
    setRxSubmitting(true);
    try {
      await prescriptionsEndpoints.create({
        patient_id: patient.id,
        medication: rxForm.medication.trim(),
        dosage: rxForm.dosage.trim() || null,
        instructions: rxForm.instructions.trim() || null,
        start_date: rxForm.start_date || undefined,
      });
      setRxForm({ medication: "", dosage: "", instructions: "", start_date: "" });
      toast.success("Prescripción creada.");
      setShowRxForm(false);
      await invalidateProfile();
    } catch (err) {
      toast.error((err as ApiError).message || "No se pudo crear prescripción.");
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleAddCondition = async () => {
    if (!condForm.name.trim()) { toast.error("Nombre es requerido."); return; }
    setCondSubmitting(true);
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
      toast.success("Condición registrada.");
      setShowConditionForm(false);
      await invalidateProfile();
    } catch (err) {
      toast.error((err as ApiError).message || "No se pudo crear condición.");
    } finally {
      setCondSubmitting(false);
    }
  };

  const handlePrescriptionStatus = (prescriptionId: string, status: PrescriptionStatus) => {
    const run = async () => {
      setPrescriptionAction(prescriptionId + status);
      try {
        await prescriptionsEndpoints.update(prescriptionId, { status });
        toast.success("Prescripción actualizada.");
        await invalidateProfile();
      } catch (err) {
        toast.error((err as ApiError).message || "No se pudo actualizar prescripción.");
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
      <section className="patient-profile-hero" aria-labelledby="patient-profile-name">
        <div className="patient-profile-header">
          <div className="patient-profile-title-section">
            <h1 id="patient-profile-name" className="patient-profile-name">{patient.full_name}</h1>
            <div className="patient-profile-header-meta">
              {age !== null && <span>{age} años</span>}
              {patient.gender && <span>{label("sex", patient.gender)}</span>}
              <span>{patient.document_number}</span>
              <span>{patient.doctor_name || "Sin médico asignado"}</span>
            </div>
          </div>
          {patient.status !== "active" && (
            <div className="patient-profile-header-badges">
              <Pill tone={getStatusVariant(patient.status)}>{label("patientStatus", patient.status)}</Pill>
            </div>
          )}
        </div>

        <div className="patient-profile-dx" aria-label="Diagnósticos activos">
          <span className="patient-profile-dx-label">Diagnósticos activos</span>
          {activeDx.length ? (
            <div className="code-chip-list">
              {activeDx.slice(0, 4).map((d) => <CodePill key={d.code} code={d.code} description={d.description} />)}
              {activeDx.length > 4 && <button type="button" className="patient-profile-dx-more" onClick={() => setTab("summary")}>{`+${activeDx.length - 4} más`}</button>}
            </div>
          ) : (
            <span className="patient-profile-dx-empty">{dxLoading ? "Cargando…" : "Sin diagnósticos CIE-10 todavía. Se agregan al escribir una consulta."}</span>
          )}
        </div>

        {alerts.length > 0 && (
          <ul className="patient-profile-alerts" aria-label="Alertas de este paciente">
            {(showAllAlerts ? alerts : alerts.slice(0, 2)).map((a) => {
              const self = a.action.route.includes(`patientId=${patient.id}`);
              const note = a.patients.find((x) => x.id === patient.id)?.note;
              return (
                <li key={a.id} className="patient-profile-alert" data-severity={a.severity}>
                  <SeverityBadge severity={a.severity} />
                  <span className="patient-profile-alert-copy">
                    <strong>{a.title}</strong>
                    <span>{note ? `${note} · ${a.detail}` : a.detail}</span>
                  </span>
                  {!self && (
                    <Link to={a.action.route} className="patient-profile-alert-action">{a.action.label}<ChevronRight size={16} aria-hidden="true" /></Link>
                  )}
                </li>
              );
            })}
            {alerts.length > 2 && (
              <li><button type="button" className="patient-profile-alerts-more" onClick={() => setShowAllAlerts((v) => !v)} aria-expanded={showAllAlerts}>
                {showAllAlerts ? "Ver menos alertas" : `Ver ${alerts.length - 2} ${alerts.length - 2 === 1 ? "alerta más" : "alertas más"}`}
              </button></li>
            )}
          </ul>
        )}

        {headerActions}
      </section>

      {headerExtra}

      <SegmentedControl
        className="patient-profile-tabs"
        label="Secciones de la ficha"
        value={tab}
        onChange={setTab}
        segments={[
          { value: "summary", label: "Resumen" },
          { value: "history", label: "Historial" },
          { value: "consults", label: "Consultas", badge: recent_consultations.length },
          { value: "documents", label: compact ? "Docs." : "Documentos", badge: recent_documents.length },
          { value: "finance", label: "Finanzas" },
        ]}
      />

      <div className="patient-profile-tabpanel" role="tabpanel" key={tab}>
      {tab === "summary" && (
        <>
      {canClinical && canAi && <PatientAiSummary patientId={patient.id} />}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Datos clave</h3>
        </div>
        <div className="patient-profile-grid">
          <InfoCard label="Edad" value={age !== null ? `${age} años` : "—"} auxiliary={patient.birth_date ? `Nació el ${formatDate(patient.birth_date)}` : undefined} />
          <InfoCard label="Sexo" value={label("sex", patient.gender)} />
          <InfoCard label="Alergias" value={allergies.length ? allergies.join(", ") : "Ninguna registrada"} />
          <InfoCard label="Medicación activa" value={active_prescriptions.length ? active_prescriptions.map((r) => r.medication).join(", ") : "Ninguna"} />
          <InfoCard label="Documento" value={patient.document_number} mono />
          <InfoCard label="Médico" value={patient.doctor_name || "—"} />
          <InfoCard label="Teléfono" value={patient.phone || "—"} auxiliary={patient.secondary_phone ? `Otro: ${patient.secondary_phone}` : undefined} />
          <InfoCard label="Aseguradora" value={patient.insurer_name || "—"} />
          <InfoCard label="Dirección" value={patient.address || "—"} />
          <InfoCard label="Última actualización" value={formatDate(patient.updated_at)} auxiliary={formatRelativeTime(patient.updated_at)} />
        </div>
      </section>
      {patient.notes && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Notas del expediente</h3>
          </div>
          <div className="patient-profile-notes">{patient.notes}</div>
        </section>
      )}
        </>
      )}
      {tab === "history" && (
        <>
      <PatientTimeline patientId={patient.id} />
      {/* ── HISTORIAL MÉDICO ─────────────────────────── */}
      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Historial médico</h3>
          <button className="patient-profile-add-btn" onClick={() => { setShowConditionForm((v) => !v); }} type="button">
            {showConditionForm ? <X size={18} /> : <Plus size={18} />}
            {showConditionForm ? "Cancelar" : "Agregar condición"}
          </button>
        </div>

        {showConditionForm && (
          <div className="patient-profile-inline-form form-stack">
            <div className="patient-profile-form-row form-grid">
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
            <div className="patient-profile-form-row form-grid">
              <label>
                Código (CIE-10 recomendado)
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
                  <option value="ICD10">CIE-10</option>
                  <option value="LOCAL">Texto libre</option>
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

            <div className="patient-profile-form-actions form-actions">
              <button className="button button-primary patient-profile-form-submit" onClick={() => void handleAddCondition()} disabled={condSubmitting} type="button">
                {condSubmitting ? "Guardando..." : "Guardar condición"}
              </button>
            </div>
          </div>
        )}

        {!active_conditions.length && !showConditionForm ? (
          <div className="patient-profile-empty-panel">Aún no hay enfermedades, alergias ni antecedentes. Agrégalos con «Agregar condición» o codifícalos al escribir una consulta.</div>
        ) : (
          <div className="patient-profile-condition-groups">
            {conditionGroups.filter((g) => g.items.length > 0).map((g) => (
              <div key={g.type} className="patient-profile-panel">
                <div className="patient-profile-panel-head">
                  <strong>{g.label}</strong>
                  <Pill tone="info">{g.items.length}</Pill>
                </div>
                <div className="patient-profile-chip-list">
                  {g.items.map((condition) => (
                    <div key={condition.id} className="patient-profile-chip">
                      <div className="patient-profile-chip-main">
                        <strong>{condition.name}</strong>
                        <div className="patient-profile-chip-badges">
                          <Pill tone={getStatusVariant(condition.status)}>{label("conditionStatus", condition.status)}</Pill>
                          {condition.normalized_system !== "ICD10" && <Pill tone="neutral">{label("codeSystem", condition.normalized_system)}</Pill>}
                          {condition.normalized_code && <Pill tone="info">{condition.normalized_code}</Pill>}
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
          <button className="patient-profile-add-btn" onClick={() => { setShowRxForm((v) => !v); }} type="button">
            {showRxForm ? <X size={18} /> : <Plus size={18} />}
            {showRxForm ? "Cancelar" : "Nueva prescripción"}
          </button>
        </div>

        {showRxForm && (
          <div className="patient-profile-inline-form form-stack">
            <div className="patient-profile-form-row form-grid">
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

            <div className="patient-profile-form-actions form-actions">
              <button className="button button-primary patient-profile-form-submit" onClick={() => void handleAddPrescription()} disabled={rxSubmitting} type="button">
                {rxSubmitting ? "Guardando..." : "Guardar prescripción"}
              </button>
            </div>
          </div>
        )}



        {!active_prescriptions.length && !showRxForm ? (
          <div className="patient-profile-empty-panel">Sin medicación activa. Agrégala con «Nueva prescripción».</div>
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
                  <Pill tone={getStatusVariant(rx.status)}>{label("prescriptionStatus", rx.status)}</Pill>
                  {rx.status === "active" && (
                    <ActionMenu
                      text={prescriptionAction?.startsWith(rx.id) ? "Guardando…" : "Gestionar"}
                      label={`Gestionar ${rx.medication}`}
                      actions={[
                        { label: "Suspender", disabled: prescriptionAction !== null, onClick: () => handlePrescriptionStatus(rx.id, "suspended") },
                        { label: "Completar", disabled: prescriptionAction !== null, onClick: () => handlePrescriptionStatus(rx.id, "completed") },
                        { label: "Descontinuar", destructive: true, disabled: prescriptionAction !== null, onClick: () => handlePrescriptionStatus(rx.id, "discontinued") },
                      ]}
                    />
                  )}
                  {rx.status === "suspended" && (
                    <button className="patient-profile-rx-btn success" disabled={prescriptionAction !== null} onClick={() => handlePrescriptionStatus(rx.id, "active")} type="button">
                      {prescriptionAction === rx.id + "active" ? "Guardando…" : "Reactivar"}
                    </button>
                  )}
                </div>
              </div>
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
                  <Pill tone="info">{rec.items.length} medicamentos</Pill>
                </div>
                {rec.notes && <p className="patient-profile-reconciliation-notes">{rec.notes}</p>}
                <div className="patient-profile-chip-list">
                  {rec.items.map((item, idx) => (
                    <div key={idx} className="patient-profile-chip">
                      <div className="patient-profile-chip-main">
                        <strong>{item.medication}</strong>
                        <div className="patient-profile-chip-badges">
                          <Pill tone="info">{decisionLabels[item.decision] || item.decision}</Pill>
                          {item.new_dosage && <Pill tone="neutral">{item.new_dosage}</Pill>}
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
      {episodes.length > 0 && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Episodios anteriores</h3>
            <span>Solo lectura · las visitas nuevas se registran como consulta</span>
          </div>
          <div className="patient-profile-activity-list">
            {episodes.map((e) => (
              <ActivityItem key={e.id} title={e.episode_type} subtitle={e.diagnosis || e.notes || "Sin diagnóstico registrado"}
                meta={`${formatDate(e.start_date)}${e.end_date ? ` – ${formatDate(e.end_date)}` : ""}`}
                badges={[{ label: label("episodeStatus", e.status), variant: e.status === "open" ? "success" : "neutral" }]} />
            ))}
          </div>
        </section>
      )}
        </>
      )}
      {tab === "consults" && <PatientConsultations patientId={patient.id} />}
      {tab === "finance" && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Finanzas del paciente</h3>
            <Button variant="gray" size="sm" onClick={() => navigate(`/billing?patientId=${patient.id}`)}><Receipt size={16} aria-hidden="true" /><span>Ver facturas</span></Button>
          </div>
          {financial.invoice_count === 0 ? (
            <div className="patient-profile-empty-panel">Aún no hay facturas para este paciente. Emítela desde el menú … de la ficha › Emitir factura.</div>
          ) : (
            <div className="patient-profile-financial-grid">
              <FinancialMetric label="Total facturado" value={formatCurrency(parseFloat(financial.total_invoiced))} />
              <FinancialMetric label="Total pagado" value={formatCurrency(parseFloat(financial.total_paid))} tone="success" />
              <FinancialMetric label="Saldo pendiente" value={formatCurrency(parseFloat(financial.outstanding_balance))} tone="warning" />
              <FinancialMetric label="Gastos del paciente" value={formatCurrency(parseFloat(financial.total_expenses))} />
              <FinancialMetric label="Margen neto" value={formatCurrency(parseFloat(financial.net_margin))} tone="success" />
            </div>
          )}
          <p className="patient-profile-fin-meta">{financial.invoice_count} {financial.invoice_count === 1 ? "factura" : "facturas"} · {financial.payment_count} {financial.payment_count === 1 ? "pago recibido" : "pagos recibidos"}</p>
        </section>
      )}
      {tab === "documents" && (
        <>
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
                subtitle={doc.review_required ? "Requiere revisión de los datos extraídos por IA" : label("documentApplication", doc.application_status)}
                meta={formatDateTime(doc.created_at)}
                badges={[
                  { label: label("documentProcessing", doc.processing_status), variant: getStatusVariant(doc.processing_status) },
                  ...(doc.review_required ? [{ label: "Revisión IA", variant: "warning" as const }] : []),
                ]}
              />
            ))}
          </div>
        </section>
      )}
          {recent_documents.length === 0 && (
            <InlineState message="Aún no hay documentos para este paciente. Sube estudios o informes y la IA extrae sus datos.">
              <Button variant="gray" onClick={() => navigate(`/documents?patientId=${patient.id}`)}><FilePlus2 size={18} aria-hidden="true" /><span>Subir documento</span></Button>
            </InlineState>
          )}
        </>
      )}
      </div>
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
        <Pill tone="neutral">{count}</Pill>
      </div>
      <div className="patient-profile-activity-list">{children}</div>
    </div>
  );
}

// keep exported for potential future use
export { ActivityPanel };

function ActivityItem({ title, subtitle, meta, badges }: { title: string; subtitle: string; meta: string; badges: Array<{ label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> }) {
  return (
    <div className="patient-profile-activity-item">
      <div className="patient-profile-activity-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <small>{meta}</small>
      </div>
      <div className="patient-profile-activity-badges">
        {badges.map((badge) => (
          <Pill key={`${title}-${badge.label}`} tone={badge.variant}>{badge.label}</Pill>
        ))}
      </div>
    </div>
  );
}
