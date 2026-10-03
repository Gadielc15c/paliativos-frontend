import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, FilePenLine, UserRound } from "lucide-react";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import InlineState from "../../../components/clinical/InlineState";
import { dashboardEndpoints } from "../../../services/endpoints/dashboard";
import { label } from "../../../utils/labels";
import { fmt, relativeDays, shortDate } from "./format";

const STATUS_TONE = { draft: "warning", signed: "success", amended: "info" } as const;
const MAX = 3;

export const TODAY_KEY = ["dashboard", "today"] as const;
export const useToday = () => useQuery({ queryKey: TODAY_KEY, queryFn: () => dashboardEndpoints.today(), staleTime: 60 * 1000, retry: 1 });

const dueText = (days: number) => (days <= 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`);
const hoursText = (h: number) => (h < 24 ? `hace ${Math.max(1, Math.round(h))} h` : `hace ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "día" : "días"}`);

/** One short list inside the Hoy card: max 3 rows, then "Ver más" expands in place (nothing is hidden for good). */
function ShortList<T>({ title, icon, items, empty, render }: { title: string; icon: ReactNode; items: T[]; empty: string; render: (item: T, i: number) => ReactNode }) {
  const [more, setMore] = useState(false);
  const shown = more ? items : items.slice(0, MAX);
  return (
    <section className="home-today-col" aria-label={title}>
      <div className="home-today-head">
        <h3 className="home-today-title">{icon}<span>{title}</span>{items.length > 0 && <span className="home-card-meta">{fmt(items.length)}</span>}</h3>
        {items.length > MAX && (
          <button type="button" className="home-more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            {more ? "Ver menos" : `Ver más (${fmt(items.length - MAX)})`}
          </button>
        )}
      </div>
      {items.length === 0 ? <p className="home-empty">{empty}</p> : (
        <ul className="home-rows">{shown.map(render)}</ul>
      )}
    </section>
  );
}

/** "Hoy": one compact card with three short lists — notes to sign, follow-ups this week, recent patients. */
export default function TodaySection() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useToday();

  return (
    <section className="home-section" aria-labelledby="home-today-title">
      <header className="home-section-head">
        <h2 id="home-today-title" className="home-section-title">Hoy</h2>
        {data && (
          <p className="home-section-meta">
            {`${fmt(data.summary.consultations_today)} ${data.summary.consultations_today === 1 ? "consulta" : "consultas"} hoy`}
            {data.summary.drafts_open !== null && ` · ${fmt(data.summary.drafts_open)} ${data.summary.drafts_open === 1 ? "nota abierta" : "notas abiertas"}`}
            {` · ${fmt(data.summary.followups_due_week)} ${data.summary.followups_due_week === 1 ? "seguimiento" : "seguimientos"} esta semana`}
          </p>
        )}
      </header>
      {isLoading ? <span className="skeleton" style={{ height: 200 }} /> : isError || !data ? (
        <div className="data-card"><div className="data-card-body"><InlineState kind="error" message="No se pudo cargar el resumen de hoy." onRetry={() => void refetch()} /></div></div>
      ) : (
        <div className="data-card home-today" data-cols={data.drafts_in_progress !== null ? 3 : 2}>
          {data.drafts_in_progress !== null && (
            <ShortList title="Notas por firmar" icon={<FilePenLine size={16} aria-hidden="true" />} items={data.drafts_in_progress}
              empty="No tienes notas pendientes."
              render={(d) => (
                <li key={d.consultation_id} className="home-row">
                  <span className="home-row-copy">
                    <span className="home-row-title">{d.patient.display_name}</span>
                    <span className="home-row-meta">{shortDate(d.consultation_date)} · {hoursText(d.hours_open)}</span>
                  </span>
                  <Button variant="tinted" size="sm" className="home-row-action" onClick={() => navigate(`/consultations/${d.consultation_id}`)}>Firmar</Button>
                </li>
              )} />
          )}
          <ShortList title="Seguimientos esta semana" icon={<CalendarClock size={16} aria-hidden="true" />} items={data.upcoming_followups}
            empty="Nadie tiene control previsto en 7 días. Los atrasados están en Alertas."
            render={(f, i) => (
              <li key={`${f.patient.id}-${i}`}>
                <Link to={`/patients?patientId=${f.patient.id}`} className="home-row is-link">
                  <span className="home-row-copy">
                    <span className="home-row-title">{f.patient.display_name}</span>
                    <span className="home-row-meta">Última visita {relativeDays(f.last_seen_at)}</span>
                  </span>
                  <span className="home-row-when">{dueText(f.days_until_due)}</span>
                  <ChevronRight size={16} className="home-row-chevron" aria-hidden="true" />
                </Link>
              </li>
            )} />
          <ShortList title="Pacientes recientes" icon={<UserRound size={16} aria-hidden="true" />} items={data.recent_patients}
            empty="Aún no hay consultas. Abre un paciente y pulsa «Nueva consulta»."
            render={(r, i) => (
              <li key={`${r.patient.id}-${i}`}>
                <Link to={r.consultation_id ? `/consultations/${r.consultation_id}` : `/patients?patientId=${r.patient.id}`} className="home-row is-link">
                  <span className="home-row-copy">
                    <span className="home-row-title">{r.patient.display_name}</span>
                    <span className="home-row-meta">{relativeDays(r.last_seen_at)}</span>
                  </span>
                  {r.status && <Pill tone={STATUS_TONE[r.status]}>{label("consultationStatus", r.status)}</Pill>}
                  <ChevronRight size={16} className="home-row-chevron" aria-hidden="true" />
                </Link>
              </li>
            )} />
        </div>
      )}
    </section>
  );
}
