import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import Button from "../../../components/common/Button";
import Sheet from "../../../components/common/Sheet";
import InlineState from "../../../components/clinical/InlineState";
import { SEVERITY_META, useDashboardAlerts } from "../../../components/clinical/alerts";
import type { AlertSeverity, DashboardAlert } from "../../../types/dashboard";
import { fmt } from "./format";

const ORDER: AlertSeverity[] = ["alert", "watch", "info"];
const TOP = 5;

/** Unique patient names (a patient can appear twice in the refs). */
function patientNames(alert: DashboardAlert, withNotes = false) {
  const unique = [...new Map(alert.patients.map((p) => [`${p.id}-${p.display_name}`, p])).values()];
  const names = unique.map((p) => (withNotes && p.note ? `${p.display_name} (${p.note})` : p.display_name)).join(", ");
  const extra = Math.max(0, alert.count - unique.length);
  return { names, extra };
}

/** One line per alert: severity icon + dot, title, count, names (truncated) and one action. The whole row is the action. */
function AlertRow({ alert, primary, expanded, onGo }: { alert: DashboardAlert; primary: boolean; expanded?: boolean; onGo: (a: DashboardAlert) => void }) {
  const meta = SEVERITY_META[alert.severity];
  const { names, extra } = patientNames(alert, expanded);
  return (
    <li>
      <button type="button" className="home-alert-row" data-severity={alert.severity} data-expanded={expanded || undefined} onClick={() => onGo(alert)}>
        <span className="home-alert-sev" title={meta.label}><meta.icon size={16} aria-hidden="true" /><span className="sr-only">{meta.label}: </span></span>
        <span className="home-alert-copy">
          <span className="home-alert-line">
            <span className="home-alert-title">{alert.title}</span>
            <span className="home-alert-count" aria-label={`${alert.count} casos`}>{fmt(alert.count)}</span>
          </span>
          {expanded && <span className="home-alert-detail">{alert.detail}</span>}
          {names && (
            <span className="home-alert-names">{names}{extra > 0 ? ` y ${fmt(extra)} más` : ""}</span>
          )}
        </span>
        <span className={primary ? "home-alert-go is-primary glow-border" : "home-alert-go"}>
          <span className="home-alert-go-label">{alert.action.label}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

function Groups({ items, primaryId, expanded, onGo }: { items: DashboardAlert[]; primaryId?: string; expanded?: boolean; onGo: (a: DashboardAlert) => void }) {
  return (
    <>
      {ORDER.map((sev) => {
        const group = items.filter((a) => a.severity === sev);
        if (!group.length) return null;
        return (
          <div key={sev} className="home-alert-group" data-severity={sev}>
            <h3 className="home-alert-group-title">{SEVERITY_META[sev].heading}</h3>
            <ul className="home-alert-list">
              {group.map((a) => <AlertRow key={a.id} alert={a} primary={a.id === primaryId} expanded={expanded} onGo={onGo} />)}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/** Alerts first, compact: top 5 by severity as one-line rows; the rest in a sheet. */
export default function AlertsSection({ onEmptyAction }: { onEmptyAction: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDashboardAlerts();
  const [all, setAll] = useState(false);
  const items = [...(data?.items ?? [])].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const top = items.slice(0, TOP);
  const primaryId = top[0]?.id;
  const go = (a: DashboardAlert) => { setAll(false); navigate(a.action.route); };

  return (
    <section className="home-section home-alerts" aria-labelledby="home-alerts-title">
      <header className="home-section-head">
        <h2 id="home-alerts-title" className="home-section-title">Alertas</h2>
        {data && items.length > 0 && (
          <p className="home-section-meta home-section-meta-grow">
            {data.counts.alert > 0 && `${fmt(data.counts.alert)} ${data.counts.alert === 1 ? "requiere" : "requieren"} atención`}
            {data.counts.alert > 0 && data.counts.watch > 0 && " · "}
            {data.counts.watch > 0 && `${fmt(data.counts.watch)} para vigilar`}
            {data.counts.info > 0 && ` · ${fmt(data.counts.info)} informativas`}
          </p>
        )}
        {items.length > TOP && (
          <Button variant="gray" size="sm" className="home-head-action" onClick={() => setAll(true)}>Ver todas ({fmt(items.length)})</Button>
        )}
      </header>

      {isLoading ? (
        <span className="skeleton" style={{ height: 240 }} />
      ) : isError ? (
        <div className="data-card"><div className="data-card-body">
          <InlineState kind="error" message="No se pudieron cargar las alertas. Revisa tu conexión." onRetry={() => void refetch()} />
        </div></div>
      ) : items.length === 0 ? (
        <div className="home-all-clear">
          <CheckCircle2 size={24} aria-hidden="true" />
          <div className="home-all-clear-copy">
            <h3>Todo en orden</h3>
            <p>No hay pacientes ni notas que necesiten atención ahora. Cuando algo cambie, aparecerá aquí primero.</p>
          </div>
          <Button variant="primary" className="glow-border" onClick={onEmptyAction}><span>Ver mis pacientes</span><ChevronRight size={18} aria-hidden="true" /></Button>
        </div>
      ) : (
        <div className="data-card home-alerts-card">
          <Groups items={top} primaryId={primaryId} onGo={go} />
        </div>
      )}

      <Sheet open={all} onClose={() => setAll(false)} title="Todas las alertas" size="lg"
        subtitle={`${fmt(items.length)} alertas, de la más urgente a la informativa. Cada una tiene una sola acción.`}>
        <div className="home-alerts-sheet">
          <Groups items={items} primaryId={primaryId} expanded onGo={go} />
        </div>
      </Sheet>
    </section>
  );
}
