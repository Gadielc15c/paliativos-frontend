import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import PageHeader from "../../../components/common/PageHeader";
import Pill, { type PillTone } from "../../../components/common/Pill";
import { RefreshCw } from "lucide-react";
import "./AuditPage.css";

const actionTone = (action: string): PillTone =>
  action === "delete" || action === "reject" ? "danger"
  : action === "create" || action === "approve" || action === "apply" ? "success"
  : action === "process" ? "ai"
  : "neutral";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { auditEndpoints } from "../../../services/endpoints";
import type { AuditLogRecord } from "../../../types/api";
import { formatDateTime } from "../../../utils/format";
import { label } from "../../../utils/labels";
import { useNavigate } from "react-router-dom";


const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

const joinStrings = (...values: unknown[]) =>
  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" · ");

const getEntityLabel = (entry: AuditLogRecord) => {
  const source = entry.after || entry.before || {};

  switch (entry.entity_type) {
    case "patient":
      return pickFirstString(source.full_name, source.document_number, entry.entity_id, "Paciente");
    case "invoice":
      return pickFirstString(source.invoice_number, entry.entity_id, "Factura");
    case "invoice_item":
      return pickFirstString(source.description, entry.entity_id, "Detalle factura");
    case "document":
      return pickFirstString(source.title, source.file_name, entry.entity_id, "Documento");
    case "episode":
      return pickFirstString(source.episode_type, source.diagnosis, entry.entity_id, "Episodio");
    case "patient_condition":
      return pickFirstString(source.normalized_name, source.name, entry.entity_id, "Condición");
    case "doctor":
      return pickFirstString(source.full_name, source.license_number, entry.entity_id, "Médico");
    case "auth":
      return "Autenticación";
    default:
      return pickFirstString(entry.entity_id, label("entityType", entry.entity_type));
  }
};

const getEntitySummary = (entry: AuditLogRecord) => {
  const source = entry.after || entry.before || {};

  switch (entry.entity_type) {
    case "patient":
      return joinStrings(typeof source.status === "string" ? label("patientStatus", source.status) : null, source.insurer_name) || "Expediente del paciente";
    case "invoice":
      return joinStrings(typeof source.status === "string" ? label("invoiceStatus", source.status) : null, source.insurer_name) || "Movimiento de facturación";
    case "document":
      return (
        joinStrings(
          typeof source.predicted_document_type_code === "string" ? label("documentType", source.predicted_document_type_code) : null,
          typeof source.processing_status === "string" ? label("documentProcessing", source.processing_status) : null,
          typeof source.application_status === "string" ? label("documentApplication", source.application_status) : null
        ) || "Documento"
      );
    case "episode":
      return joinStrings(typeof source.status === "string" ? label("episodeStatus", source.status) : null, source.insurer_name) || "Seguimiento clínico";
    case "patient_condition":
      return joinStrings(typeof source.condition_type === "string" ? label("conditionType", source.condition_type) : null, source.normalized_code) || "Historial clínico";
    case "auth":
      return entry.action === "login" ? "Acceso concedido" : "Sesión renovada";
    default:
      return pickFirstString(source.notes, source.description, "Sin resumen adicional");
  }
};

const getActorLabel = (entry: AuditLogRecord) => {
  if (!entry.user_id) return "Sistema";
  return `${entry.user_id.slice(0, 8)}…`;
};

export default function AuditPage() {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["audit", "list"],
    queryFn: () => auditEndpoints.list({ page: 1, pageSize: 100 }),
  });

  const summary = useMemo(() => {
    const items = data?.items || [];
    return {
      total: items.length,
      documentOps: items.filter((entry) => entry.entity_type === "document").length,
      clinicalOps: items.filter((entry) =>
        ["patient", "episode", "patient_condition"].includes(entry.entity_type)
      ).length,
      billingOps: items.filter((entry) =>
        ["invoice", "invoice_item", "payment"].includes(entry.entity_type)
      ).length,
    };
  }, [data]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <Error message="No se pudo cargar el registro de actividad." onRetry={() => void refetch()} />;
  }

  return (
    <div className="data-screen">
      <PageHeader
        back={{ label: "Administración", onClick: () => navigate("/admin") }}
        title="Registro de actividad"
        description="Quién hizo qué, sobre quién y cuándo. Sirve para revisar cambios y accesos."
        actions={
          <Button variant="gray" onClick={() => void refetch()} isLoading={isFetching}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Actualizar</span>
          </Button>
        }
      />

      <section className="data-stat-grid">
        <article className="data-stat-card">
          <span className="data-stat-label">Eventos</span>
          <strong className="data-stat-value">{summary.total}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Documental</span>
          <strong className="data-stat-value">{summary.documentOps}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Clínico</span>
          <strong className="data-stat-value">{summary.clinicalOps}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Facturación</span>
          <strong className="data-stat-value">{summary.billingOps}</strong>
        </article>
      </section>

      <section className="data-card">
        <header className="data-card-header">
          <div>
            <h2 className="data-card-title">Eventos recientes</h2>
            <p className="data-card-subtitle">{data.total === 1 ? "1 evento guardado" : `${data.total.toLocaleString("es-DO")} eventos guardados`}</p>
          </div>
        </header>
        <div className="data-card-body">
          {data.items.length === 0 ? (
            <Empty message="Todavía no hay actividad registrada. Cada inicio de sesión, firma o cambio aparecerá aquí." />
          ) : (
            <DataList
              label="Eventos de auditoría"
              rows={data.items}
              rowKey={(entry) => entry.id}
              title={(entry) => getEntitySummary(entry)}
              subtitle={(entry) => `${getEntityLabel(entry)} · ${formatDateTime(entry.created_at)}`}
              detail={(entry) => <span className="audit-actor">{getActorLabel(entry)}</span>}
              status={(entry) => <Pill tone={actionTone(entry.action)}>{label("auditAction", entry.action)}</Pill>}
              columns={[
                { key: "date", header: "Fecha", cell: (entry) => formatDateTime(entry.created_at), numeric: true, width: "15%" },
                { key: "action", header: "Acción", cell: (entry) => <Pill tone={actionTone(entry.action)}>{label("auditAction", entry.action)}</Pill>, width: "15%" },
                {
                  key: "entity", header: "Entidad", width: "20%",
                  cell: (entry) => (
                    <span className="audit-entity">
                      <strong>{label("entityType", entry.entity_type)}</strong>
                      <span className="data-list-meta">{getEntityLabel(entry)}</span>
                    </span>
                  ),
                },
                { key: "summary", header: "Resumen", cell: (entry) => getEntitySummary(entry) },
                { key: "actor", header: "Usuario", cell: (entry) => <span className="cell-code" title={getActorLabel(entry)}>{getActorLabel(entry)}</span>, width: "14%" },
                { key: "ip", header: "IP", cell: (entry) => entry.ip || "—", numeric: true, width: "11%" },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
