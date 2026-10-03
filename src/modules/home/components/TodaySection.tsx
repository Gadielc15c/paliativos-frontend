import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, FilePenLine, UserRound } from "lucide-react";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import InlineState from "../../../components/clinical/InlineState";
import { dashboardEndpoints } from "../../../services/endpoints/dashboard";
import { label } from "../../../utils/labels";
import type { DashboardToday } from "../../../types/dashboard";
import { fmt, relativeDays, shortDate } from "./format";

const STATUS_TONE = { draft: "warning", signed: "success", amended: "info" } as const;

export const TODAY_KEY = ["dashboard", "today"] as const;
export const useToday = () => useQuery({ queryKey: TODAY_KEY, queryFn: () => dashboardEndpoints.today(), staleTime: 60 * 1000, retry: 1 });

function Card({ title, icon, meta, children }: { title: string; icon: JSX.Element; meta?: string; children: React.ReactNode }) {
  return (
    <section className="data-card home-today-card">
      <div className="data-card-header">
        <h3 className="home-card-title">{icon}{title}</h3>
        {meta && <span className="home-card-meta">{meta}</span>}
      </div>
      <div className="data-card-body">{children}</div>
    </section>
  );
}

const dueText = (days: number) => (days <= 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`);
const hoursText = (h: number) => (h < 24 ? `abierta hace ${Math.max(1, Math.round(h))} h` : `abierta hace ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "día" : "días"}`);

/** "Hoy": recent patients, drafts to sign (doctors/admin) and follow-ups due this week. */
export default function TodaySection() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useToday();
  const drafts: DashboardToday["drafts_in_progress"] = data?.drafts_in_progress ?? null;

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
      {isLoading ? (
        <div className="home-grid">{[0, 1, 2].map((i) => <span key={i} className="skeleton home-span-4" style={{ height: 220 }} />)}</div>
      ) : isError || !data ? (
        <div className="data-card"><div className="data-card-body"><InlineState kind="error" message="No se pudo cargar el resumen de hoy." onRetry={() => void refetch()} /></div></div>
      ) : (
        <div className="home-grid home-today">
          {drafts !== null && (
            <div className="home-span-4">
              <Card title="Notas por firmar" icon={<FilePenLine size={18} aria-hidden="true" />} meta={drafts.length ? fmt(drafts.length) : undefined}>
                {drafts.length === 0 ? (
                  <p className="home-empty">No tienes notas pendientes. Al terminar una consulta, fírmala para que cuente en las estadísticas.</p>
                ) : (
                  <ul className="home-rows">
                    {drafts.map((d) => (
                      <li key={d.consultation_id} className="home-row">
                        <span className="home-row-copy">
                          <span className="home-row-title">{d.patient.display_name}</span>
                          <span className="home-row-meta">{shortDate(d.consultation_date)} · {hoursText(d.hours_open)}</span>
                        </span>
                        <Button variant="tinted" size="sm" className="home-row-action" onClick={() => navigate(`/consultations/${d.consultation_id}`)}>Firmar</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
          <div className={drafts !== null ? "home-span-4" : "home-span-6"}>
            <Card title="Seguimientos de esta semana" icon={<CalendarClock size={18} aria-hidden="true" />} meta={data.upcoming_followups.length ? fmt(data.upcoming_followups.length) : undefined}>
              {data.upcoming_followups.length === 0 ? (
                <p className="home-empty">Nadie tiene control previsto en los próximos 7 días. Los atrasados aparecen arriba, en Alertas.</p>
              ) : (
                <ul className="home-rows">
                  {data.upcoming_followups.map((f, i) => (
                    <li key={`${f.patient.id}-${i}`}>
                      <Link to={`/patients?patientId=${f.patient.id}`} className="home-row is-link">
                        <span className="home-row-copy">
                          <span className="home-row-title">{f.patient.display_name}</span>
                          <span className="home-row-meta">Última visita {relativeDays(f.last_seen_at)}</span>
                        </span>
                        <span className="home-row-when">{dueText(f.days_until_due)}</span>
                        <ChevronRight size={18} className="home-row-chevron" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className={drafts !== null ? "home-span-4" : "home-span-6"}>
            <Card title="Pacientes recientes" icon={<UserRound size={18} aria-hidden="true" />}>
              {data.recent_patients.length === 0 ? (
                <p className="home-empty">Aún no hay consultas. Abre un paciente y pulsa «Nueva consulta» para empezar.</p>
              ) : (
                <ul className="home-rows">
                  {data.recent_patients.map((r, i) => (
                    <li key={`${r.patient.id}-${i}`}>
                      <Link to={r.consultation_id ? `/consultations/${r.consultation_id}` : `/patients?patientId=${r.patient.id}`} className="home-row is-link">
                        <span className="home-row-copy">
                          <span className="home-row-title">{r.patient.display_name}</span>
                          <span className="home-row-meta">{relativeDays(r.last_seen_at)}</span>
                        </span>
                        {r.status && <Pill tone={STATUS_TONE[r.status]}>{label("consultationStatus", r.status)}</Pill>}
                        <ChevronRight size={18} className="home-row-chevron" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
