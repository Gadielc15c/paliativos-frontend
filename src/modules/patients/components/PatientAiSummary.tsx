import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Info, RefreshCw } from "lucide-react";
import Button from "../../../components/common/Button";
import AiPill from "../../../components/clinical/AiPill";
import InlineState from "../../../components/clinical/InlineState";
import { aiEndpoints } from "../../../services/endpoints";
import type { AiPatientSummary } from "../../../types/clinical";
import { formatDate, formatRelativeTime } from "../../../utils/format";
import "../../../components/clinical/clinical.css";

export const aiSummaryKey = (patientId: string) => ["ai-patient-summary", patientId];

/** Shared query: the profile header reads active diagnoses from the same cache. */
export function useAiPatientSummary(patientId: string, enabled = true) {
  return useQuery({ queryKey: aiSummaryKey(patientId), queryFn: () => aiEndpoints.patientSummary(patientId), staleTime: 30 * 60 * 1000, retry: 1, enabled });
}

/** Source chips at the END of a line. Consultations link to the note; prescriptions are static. */
function Refs({ refs, data }: { refs: string[]; data: AiPatientSummary }) {
  if (!refs.length) return null;
  return (
    <span className="ai-refs">
      {refs.map((r) => {
        const src = data.sources.find((s) => s.ref === r);
        if (src?.type === "consultation") {
          return <Link key={r} className="ai-ref" to={`/consultations/${src.id}`} title={`Fuente: consulta del ${formatDate(src.date)}`} aria-label={`Abrir consulta del ${formatDate(src.date)}`}>{r}</Link>;
        }
        return <span key={r} className="ai-ref is-static" title={src ? `Fuente: ${src.type === "prescription" ? "prescripción" : "condición"} del ${formatDate(src.date)}` : undefined}>{r}</span>;
      })}
    </span>
  );
}

/** The first sentence of the narrative is the patient's one-line context ("Paciente de 72 años…"). */
function leadSentence(narrative: string) {
  const first = narrative.split(/(?<=\.)\s+/)[0] ?? "";
  return /\[|registro/i.test(first) || first.length > 220 ? null : first;
}

export default function PatientAiSummary({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, isFetching, refetch } = useAiPatientSummary(patientId);
  const lead = data ? leadSentence(data.narrative) : null;
  const empty = data && !data.active_conditions.length && !data.recent_events.length && !data.medications.length;

  return (
    <section className="ai-card glow-border patient-ai-summary" data-tone="ai" aria-labelledby="patient-ai-title" aria-busy={isFetching || undefined}>
      <div className="ai-card-head">
        <h2 id="patient-ai-title" className="ai-card-title">Resumen clínico <AiPill /></h2>
        <Button variant="gray" size="sm" onClick={() => { void qc.invalidateQueries({ queryKey: aiSummaryKey(patientId) }); }} disabled={isFetching}>
          <RefreshCw size={16} aria-hidden="true" className={isFetching ? "spin" : undefined} /><span>{isFetching ? "Generando…" : "Regenerar"}</span>
        </Button>
      </div>
      {isLoading ? (
        <div className="ai-shimmer"><span /><span /><span /></div>
      ) : isError ? (
        <InlineState kind="error" message="No se pudo generar el resumen del paciente." onRetry={() => void refetch()} />
      ) : data && (
        <>
          {lead && <p className="ai-summary-lead">{lead}</p>}
          {empty && <p className="ai-summary-lead">Aún no hay consultas firmadas para resumir. El resumen aparece cuando firmes la primera nota.</p>}
          {data.active_conditions.length > 0 && (
            <div className="ai-summary-block">
              <h3 className="ai-summary-label">Condiciones activas</h3>
              <ul className="ai-bullets">
                {data.active_conditions.map((c) => (
                  <li key={c.code} className="ai-bullet">
                    <span className="code-pill">{c.code}</span>
                    <span className="ai-bullet-text">
                      <strong>{c.description}</strong>
                      <span className="ai-bullet-meta">{c.count > 1 ? `En ${c.count} consultas · última ${formatDate(c.last_seen)}` : `Registrada el ${formatDate(c.last_seen)}`}</span>
                    </span>
                    <Refs refs={c.refs} data={data} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.recent_events.length > 0 && (
            <div className="ai-summary-block">
              <h3 className="ai-summary-label">Eventos recientes</h3>
              <ul className="ai-bullets">
                {data.recent_events.map((e) => (
                  <li key={e.ref} className="ai-bullet">
                    <span className="ai-bullet-date">{formatDate(e.date, "dd/MM/yy")}</span>
                    <span className="ai-bullet-text">
                      <strong>{e.assessment || e.chief_complaint || "Consulta"}</strong>
                      {e.plan && <span className="ai-bullet-meta">Plan: {e.plan}</span>}
                    </span>
                    <Refs refs={[e.ref]} data={data} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.medications.length > 0 && (
            <div className="ai-summary-block">
              <h3 className="ai-summary-label">Medicación</h3>
              <ul className="ai-bullets">
                {data.medications.map((m) => (
                  <li key={m.ref} className="ai-bullet">
                    <span className="ai-bullet-dot" aria-hidden="true" />
                    <span className="ai-bullet-text">
                      <strong>{[m.medication, m.dosage].filter(Boolean).join(" · ")}</strong>
                      {(m.instructions || m.start_date) && <span className="ai-bullet-meta">{[m.instructions, m.start_date && `Desde ${formatDate(m.start_date)}`].filter(Boolean).join(" · ")}</span>}
                    </span>
                    <Refs refs={[m.ref]} data={data} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="ai-summary-foot">
            <p className="ai-disclaimer"><Info size={14} aria-hidden="true" />{data.disclaimer_text}</p>
            <span className="ai-meta">Generado {formatRelativeTime(data.generated_at)} · {data.provider === "offline" ? "asistente local" : data.model}{data.fallback ? " · respaldo local" : ""}</span>
          </div>
        </>
      )}
    </section>
  );
}
