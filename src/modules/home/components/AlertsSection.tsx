import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronRight, Users } from "lucide-react";
import clsx from "clsx";
import Button from "../../../components/common/Button";
import InlineState from "../../../components/clinical/InlineState";
import { SEVERITY_META, SeverityBadge, useDashboardAlerts } from "../../../components/clinical/alerts";
import type { AlertSeverity, DashboardAlert } from "../../../types/dashboard";
import { fmt } from "./format";

const ORDER: AlertSeverity[] = ["alert", "watch", "info"];

function PatientNames({ alert }: { alert: DashboardAlert }) {
  if (!alert.patients.length) return null;
  // Same patient can appear twice in a list of refs; show unique names.
  const names = [...new Map(alert.patients.map((p) => [`${p.id}-${p.display_name}`, p])).values()];
  const shown = names.slice(0, 3);
  const extra = Math.max(0, alert.count - shown.length);
  return (
    <p className="home-alert-patients">
      <Users size={16} aria-hidden="true" />
      <span>
        {shown.map((p, i) => (
          <span key={`${p.id}-${i}`} className="home-alert-patient">
            {p.display_name}{p.note ? <span className="home-alert-note"> ({p.note})</span> : null}{i < shown.length - 1 ? ", " : ""}
          </span>
        ))}
        {extra > 0 && <span className="home-alert-more"> y {fmt(extra)} más</span>}
      </span>
    </p>
  );
}

function AlertCard({ alert, first }: { alert: DashboardAlert; first: boolean }) {
  const navigate = useNavigate();
  return (
    <article className="home-alert" data-severity={alert.severity} aria-labelledby={`alert-${alert.id}`}>
      <div className="home-alert-top">
        <SeverityBadge severity={alert.severity} />
        <span className="home-alert-count" aria-label={`${alert.count} casos`}>{fmt(alert.count)}</span>
      </div>
      <h3 id={`alert-${alert.id}`} className="home-alert-title">{alert.title}</h3>
      <p className="home-alert-detail">{alert.detail}</p>
      <PatientNames alert={alert} />
      <Button variant={first ? "primary" : "tinted"} className={clsx("home-alert-action", first && "glow-border")} onClick={() => navigate(alert.action.route)}>
        <span>{alert.action.label}</span><ChevronRight size={18} aria-hidden="true" />
      </Button>
    </article>
  );
}

/** Alerts first: grouped by severity, one action per card. Info-level is collapsed by default. */
export default function AlertsSection({ onEmptyAction }: { onEmptyAction: () => void }) {
  const { data, isLoading, isError, refetch } = useDashboardAlerts();
  const [showInfo, setShowInfo] = useState(false);
  const items = data?.items ?? [];
  const urgent = items.filter((a) => a.severity !== "info");
  const firstId = (urgent[0] ?? items[0])?.id;

  return (
    <section className="home-section home-alerts" aria-labelledby="home-alerts-title">
      <header className="home-section-head">
        <h2 id="home-alerts-title" className="home-section-title">Alertas</h2>
        {data && items.length > 0 && (
          <p className="home-section-meta">
            {data.counts.alert > 0 && `${fmt(data.counts.alert)} ${data.counts.alert === 1 ? "requiere" : "requieren"} atención`}
            {data.counts.alert > 0 && data.counts.watch > 0 && " · "}
            {data.counts.watch > 0 && `${fmt(data.counts.watch)} para vigilar`}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="home-alert-grid">{[0, 1].map((i) => <span key={i} className="skeleton" style={{ height: 200 }} />)}</div>
      ) : isError ? (
        <div className="data-card"><div className="data-card-body">
          <InlineState kind="error" message="No se pudieron cargar las alertas. Revisa tu conexión." onRetry={() => void refetch()} />
        </div></div>
      ) : items.length === 0 ? (
        <div className="home-all-clear">
          <CheckCircle2 size={28} aria-hidden="true" />
          <div className="home-all-clear-copy">
            <h3>Todo en orden</h3>
            <p>No hay pacientes ni notas que necesiten atención ahora. Cuando algo cambie, aparecerá aquí primero.</p>
          </div>
          <Button variant="primary" className="glow-border" onClick={onEmptyAction}><span>Ver mis pacientes</span><ChevronRight size={18} aria-hidden="true" /></Button>
        </div>
      ) : (
        ORDER.map((sev) => {
          const group = items.filter((a) => a.severity === sev);
          if (!group.length) return null;
          const collapsed = sev === "info" && !showInfo;
          return (
            <div key={sev} className="home-alert-group" data-severity={sev}>
              {sev === "info" ? (
                <button type="button" className="home-disclosure" aria-expanded={showInfo} onClick={() => setShowInfo((v) => !v)}>
                  <ChevronDown size={18} aria-hidden="true" className="home-disclosure-icon" />
                  <span>{SEVERITY_META.info.heading}</span>
                  <span className="home-disclosure-count">{fmt(group.length)}</span>
                </button>
              ) : (
                <h3 className="home-alert-group-title">{SEVERITY_META[sev].heading}</h3>
              )}
              {!collapsed && (
                <div className="home-alert-grid">
                  {group.map((a) => <AlertCard key={a.id} alert={a} first={a.id === firstId} />)}
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
