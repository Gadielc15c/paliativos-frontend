import Badge from "../../../components/common/Badge";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import type {
  DocumentRecord,
  EpisodeRecord,
  InvoiceRecord,
  PatientConditionRecord,
  PaymentRecord,
} from "../../../types/api";
import type { PatientContract } from "../../../types/contracts";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from "../../../utils/format";
import "./PatientProfile.css";

interface PatientWorkspaceSummary {
  billedTotal: number;
  paidTotal: number;
  balanceTotal: number;
  invoiceCount: number;
  paymentsCount: number;
  documentCount: number;
  appliedDocumentCount: number;
  pendingDocumentCount: number;
  episodeCount: number;
  openEpisodeCount: number;
  conditionCount: number;
  activeConditionCount: number;
}

interface PatientWorkspace {
  conditions: PatientConditionRecord[];
  episodes: EpisodeRecord[];
  invoices: InvoiceRecord[];
  documents: DocumentRecord[];
  payments: PaymentRecord[];
  summary: PatientWorkspaceSummary;
}

interface PatientProfileProps {
  patient: PatientContract | null | undefined;
  workspace?: PatientWorkspace | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const conditionLabels: Record<PatientConditionRecord["condition_type"], string> = {
  diagnosis: "Diagnósticos",
  comorbidity: "Comorbilidades",
  allergy: "Alergias",
  antecedent: "Antecedentes",
};

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
      return "warning";
    case "cancelled":
    case "rejected":
    case "failed":
      return "error";
    default:
      return "info";
  }
};

const getAge = (birthDate?: string) => {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  return `${years} años`;
};

export default function PatientProfile({
  patient,
  workspace,
  isLoading,
  isError,
  onRetry,
}: PatientProfileProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!patient) return <Empty message="Selecciona un paciente" />;

  const groupedConditions = Object.entries(conditionLabels).map(([type, label]) => ({
    type,
    label,
    items: (workspace?.conditions || []).filter((condition) => condition.condition_type === type),
  }));

  return (
    <div className="patient-profile">
      <section className="patient-profile-hero">
        <div className="patient-profile-header">
          <div className="patient-profile-title-section">
            <p className="patient-profile-kicker">Ficha del paciente</p>
            <h1 className="patient-profile-name">{patient.name}</h1>
            <div className="patient-profile-header-meta">
              <span>{patient.document}</span>
              <span>{patient.insuranceCompany || "Sin aseguradora"}</span>
              <span>{patient.assignedDoctor || "Sin doctor asignado"}</span>
            </div>
          </div>
          <div className="patient-profile-header-badges">
            <Badge variant={getStatusVariant(patient.status)}>{patient.status.toUpperCase()}</Badge>
            {patient.gender && <Badge variant="neutral">{patient.gender.toUpperCase()}</Badge>}
          </div>
        </div>

        <div className="patient-profile-stat-grid">
          <MetricCard label="Saldo pendiente" value={formatCurrency(workspace?.summary.balanceTotal || 0)} tone="warning" />
          <MetricCard label="Facturas" value={`${workspace?.summary.invoiceCount || 0}`} tone="info" />
          <MetricCard label="Documentos" value={`${workspace?.summary.documentCount || 0}`} tone="success" />
          <MetricCard label="Hallazgos clínicos" value={`${workspace?.summary.conditionCount || 0}`} tone="neutral" />
        </div>
      </section>

      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Resumen clínico y administrativo</h3>
          <span>{workspace?.summary.openEpisodeCount || 0} episodios abiertos</span>
        </div>
        <div className="patient-profile-grid">
          <InfoCard label="Documento" value={patient.document} mono />
          <InfoCard
            label="Nacimiento"
            value={patient.birthDate ? formatDate(patient.birthDate) : "—"}
            auxiliary={getAge(patient.birthDate)}
          />
          <InfoCard label="Teléfono principal" value={patient.phone || "—"} />
          <InfoCard label="Teléfono secundario" value={patient.secondaryPhone || "—"} />
          <InfoCard label="Dirección" value={patient.address || "—"} />
          <InfoCard label="Aseguradora" value={patient.insuranceCompany || "—"} />
          <InfoCard label="Doctor asignado" value={patient.assignedDoctor || "—"} />
          <InfoCard
            label="Última actualización"
            value={formatDate(patient.updatedAt)}
            auxiliary={formatRelativeTime(patient.updatedAt)}
          />
        </div>
      </section>

      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Historial médico</h3>
          <span>{workspace?.summary.activeConditionCount || 0} condiciones activas</span>
        </div>
        {!workspace?.conditions.length ? (
          <div className="patient-profile-empty-panel">Todavía no hay enfermedades, alergias o antecedentes registrados.</div>
        ) : (
          <div className="patient-profile-condition-groups">
            {groupedConditions
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.type} className="patient-profile-panel">
                  <div className="patient-profile-panel-head">
                    <strong>{group.label}</strong>
                    <Badge variant="info">{group.items.length}</Badge>
                  </div>
                  <div className="patient-profile-chip-list">
                    {group.items.map((condition) => (
                      <div key={condition.id} className="patient-profile-chip">
                        <div className="patient-profile-chip-main">
                          <strong>{condition.name}</strong>
                          <div className="patient-profile-chip-badges">
                            <Badge variant={getStatusVariant(condition.status)}>{condition.status}</Badge>
                            <Badge variant="neutral">{condition.normalized_system}</Badge>
                            {condition.normalized_code && (
                              <Badge variant="info">{condition.normalized_code}</Badge>
                            )}
                          </div>
                        </div>
                        <span className="patient-profile-chip-meta">
                          {condition.source_text || condition.normalized_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Finanzas del paciente</h3>
          <span>{workspace?.summary.paymentsCount || 0} movimientos cobrados</span>
        </div>
        <div className="patient-profile-financial-grid">
          <FinancialMetric label="Total facturado" value={formatCurrency(workspace?.summary.billedTotal || 0)} />
          <FinancialMetric label="Total pagado" value={formatCurrency(workspace?.summary.paidTotal || 0)} tone="success" />
          <FinancialMetric label="Balance" value={formatCurrency(workspace?.summary.balanceTotal || 0)} tone="warning" />
        </div>
      </section>

      <section className="patient-profile-section">
        <div className="patient-profile-section-head">
          <h3>Actividad reciente</h3>
          <span>{workspace?.summary.documentCount || 0} documentos trazados</span>
        </div>
        <div className="patient-profile-activity-grid">
          <ActivityPanel title="Documentos" count={workspace?.documents.length || 0}>
            {!workspace?.documents.length ? (
              <div className="patient-profile-empty-panel">Sin documentos vinculados todavía.</div>
            ) : (
              workspace?.documents.slice(0, 4).map((document) => (
                <ActivityItem
                  key={document.id}
                  title={document.title}
                  subtitle={`${document.predicted_document_type_code || "SIN_TIPO"} · ${document.file_name || "sin archivo"}`}
                  meta={formatDateTime(document.created_at)}
                  badges={[
                    { label: document.processing_status, variant: getStatusVariant(document.processing_status) },
                    { label: document.application_status, variant: getStatusVariant(document.application_status) },
                  ]}
                />
              ))
            )}
          </ActivityPanel>

          <ActivityPanel title="Facturación" count={workspace?.invoices.length || 0}>
            {!workspace?.invoices.length ? (
              <div className="patient-profile-empty-panel">Sin facturas emitidas para este paciente.</div>
            ) : (
              workspace?.invoices.slice(0, 4).map((invoice) => (
                <ActivityItem
                  key={invoice.id}
                  title={invoice.invoice_number}
                  subtitle={invoice.notes || invoice.insurer_name || "Factura clínica"}
                  meta={`${formatDate(invoice.issue_date)} · ${formatCurrency(Number(invoice.total))}`}
                  badges={[{ label: invoice.status, variant: getStatusVariant(invoice.status) }]}
                />
              ))
            )}
          </ActivityPanel>

          <ActivityPanel title="Episodios" count={workspace?.episodes.length || 0}>
            {!workspace?.episodes.length ? (
              <div className="patient-profile-empty-panel">Sin episodios clínicos registrados.</div>
            ) : (
              workspace?.episodes.slice(0, 4).map((episode) => (
                <ActivityItem
                  key={episode.id}
                  title={episode.episode_type}
                  subtitle={episode.diagnosis || episode.notes || "Sin diagnóstico resumido"}
                  meta={formatDateTime(episode.start_date)}
                  badges={[{ label: episode.status, variant: getStatusVariant(episode.status) }]}
                />
              ))
            )}
          </ActivityPanel>
        </div>
      </section>

      {patient.notes && (
        <section className="patient-profile-section">
          <div className="patient-profile-section-head">
            <h3>Notas del expediente</h3>
            <span>Texto clínico / administrativo</span>
          </div>
          <div className="patient-profile-notes">{patient.notes}</div>
        </section>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "info" | "neutral";
}) {
  return (
    <div className={`patient-profile-metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <div className={`patient-profile-financial-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoCard({
  label,
  value,
  auxiliary,
  mono = false,
}: {
  label: string;
  value: string;
  auxiliary?: string;
  mono?: boolean;
}) {
  return (
    <div className="patient-profile-info-card">
      <span className="label">{label}</span>
      <strong className={mono ? "mono" : ""}>{value}</strong>
      {auxiliary && <span className="auxiliary">{auxiliary}</span>}
    </div>
  );
}

function ActivityPanel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
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

function ActivityItem({
  title,
  subtitle,
  meta,
  badges,
}: {
  title: string;
  subtitle: string;
  meta: string;
  badges: Array<{
    label: string;
    variant: "success" | "warning" | "error" | "info" | "neutral";
  }>;
}) {
  return (
    <div className="patient-profile-activity-item">
      <div className="patient-profile-activity-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <small>{meta}</small>
      </div>
      <div className="patient-profile-activity-badges">
        {badges.map((badge) => (
          <Badge key={`${title}-${badge.label}`} variant={badge.variant}>
            {badge.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
