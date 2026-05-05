import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { auditEndpoints } from "../../../services/endpoints";
import type { AuditLogRecord } from "../../../types/api";
import { formatDateTime } from "../../../utils/format";

const actionLabels: Record<string, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  login: "Inicio de sesión",
  refresh: "Renovación de sesión",
  upload: "Carga de documento",
  process: "Procesamiento",
  approve: "Aprobación",
  apply: "Aplicación",
  reject: "Rechazo",
};

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
      return pickFirstString(source.full_name, source.license_number, entry.entity_id, "Doctor");
    case "auth":
      return "Autenticación";
    default:
      return pickFirstString(entry.entity_id, entry.entity_type);
  }
};

const getEntitySummary = (entry: AuditLogRecord) => {
  const source = entry.after || entry.before || {};

  switch (entry.entity_type) {
    case "patient":
      return joinStrings(source.status, source.insurer_name) || "Expediente del paciente";
    case "invoice":
      return joinStrings(source.status, source.insurer_name) || "Movimiento de facturación";
    case "document":
      return (
        joinStrings(
          source.predicted_document_type_code,
          source.processing_status,
          source.application_status
        ) || "Pipeline documental"
      );
    case "episode":
      return joinStrings(source.status, source.insurer_name) || "Seguimiento clínico";
    case "patient_condition":
      return joinStrings(source.condition_type, source.normalized_code) || "Historial clínico";
    case "auth":
      return entry.action === "login" ? "Acceso concedido" : "Token renovado";
    default:
      return pickFirstString(source.notes, source.description, "Sin resumen adicional");
  }
};

const getActorLabel = (entry: AuditLogRecord) => {
  if (!entry.user_id) return "system";
  return `${entry.user_id.slice(0, 8)}…`;
};

export default function AuditPage() {
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
    return <Error message="No se pudo cargar auditoría." onRetry={() => void refetch()} />;
  }

  return (
    <div className="data-screen">
      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Auditoría operativa</span>
          <h1>Trazas del sistema</h1>
          <p className="data-screen-description">
            Auditoría con contexto útil: qué pasó, sobre quién y en qué parte del flujo.
          </p>
        </div>
        <div className="data-screen-actions">
          <Button variant="secondary" onClick={() => void refetch()} isLoading={isFetching}>
            Actualizar
          </Button>
        </div>
      </section>

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
            <p className="data-card-subtitle">{data.total} registros en backend</p>
          </div>
        </header>
        <div className="data-card-body">
          {data.items.length === 0 ? (
            <Empty message="Sin eventos de auditoría." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Resumen</th>
                  <th>Actor</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>{actionLabels[entry.action] || entry.action}</td>
                    <td>
                      <strong>{entry.entity_type}</strong>
                      <div className="data-list-meta">{getEntityLabel(entry)}</div>
                    </td>
                    <td>{getEntitySummary(entry)}</td>
                    <td className="data-table-mono">{getActorLabel(entry)}</td>
                    <td className="data-table-mono">{entry.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
