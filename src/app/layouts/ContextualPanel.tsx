import { AlertCircle } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useContextActions } from "../store/useContextActions";

const routeTitles: Record<string, string> = {
  "/patients": "Paciente activo",
  "/billing": "Facturación activa",
  "/episodes": "Episodios",
  "/documents": "Documentos",
  "/finance": "Movimientos",
  "/reports": "Reportes",
  "/audit": "Auditoría",
  "/secretaries": "Secretarias",
  "/config": "Configuración visual",
};

export default function ContextualPanel() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const invoiceId = searchParams.get("invoiceId");
  const title = routeTitles[location.pathname] || "Contexto";
  const actions = useContextActions((state) => state.actions);
  const message = useContextActions((state) => state.message);
  const error = useContextActions((state) => state.error);
  const summary = useContextActions((state) => state.summary);
  const summaryTitle = useContextActions((state) => state.summaryTitle);
  const alerts = useContextActions((state) => state.alerts);

  return (
    <aside className="contextual-panel">
      <div className="contextual-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="contextual-panel-content contextual-panel-content-start">
        <div className="contextual-panel-group">
          <strong>Contexto actual</strong>
          <p className="contextual-panel-placeholder">
            {patientId
              ? `Paciente seleccionado: ${patientId}`
              : "Sin paciente seleccionado"}
          </p>
          {invoiceId && (
            <p className="contextual-panel-placeholder">Factura en foco: {invoiceId}</p>
          )}
        </div>

        {summary.length > 0 && (
          <div className="contextual-panel-group">
            <strong>{summaryTitle || "Resumen rápido"}</strong>
            <dl className="contextual-panel-summary">
              {summary.map((item) => (
                <div key={item.label} className="contextual-panel-summary-row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="contextual-panel-group">
          <strong>Acciones del paciente</strong>
          <div className="contextual-panel-links">
            {patientId && (
              <>
                <Link to={`/billing?patientId=${patientId}`} className="contextual-link">
                  Ir a Facturación
                </Link>
                <Link to={`/documents?patientId=${patientId}`} className="contextual-link">
                  Ir a Documentos
                </Link>
              </>
            )}
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="contextual-link"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                title={action.title}
              >
                {action.icon}
                <span>{action.loading ? "Procesando…" : action.label}</span>
              </button>
            ))}
            {!patientId && actions.length === 0 && (
              <p className="contextual-panel-placeholder">
                Selecciona un paciente para habilitar acciones.
              </p>
            )}
          </div>
          {message && <p className="contextual-panel-feedback success">{message}</p>}
          {error && <p className="contextual-panel-feedback error">{error}</p>}
        </div>

        {alerts.length > 0 && (
          <div className="contextual-panel-group">
            <strong>Alertas</strong>
            <div className="contextual-panel-alerts">
              {alerts.map((alert) => (
                <div
                  key={alert.message}
                  className={`contextual-panel-alert ${alert.tone}`}
                >
                  <AlertCircle size={14} />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
