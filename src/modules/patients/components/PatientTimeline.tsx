import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Pill as PillIcon, Stethoscope } from "lucide-react";
import Pill from "../../../components/common/Pill";
import SegmentedControl from "../../../components/common/SegmentedControl";
import InlineState from "../../../components/clinical/InlineState";
import { patientsEndpoints } from "../../../services/endpoints";
import type { TimelineItem, TimelineType } from "../../../types/clinical";
import { formatDate } from "../../../utils/format";

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "info" | "neutral" }> = {
  draft: { label: "Borrador", tone: "warning" }, signed: { label: "Firmada", tone: "success" }, amended: { label: "Con enmiendas", tone: "info" },
  active: { label: "Activa", tone: "success" }, approved: { label: "Aprobado", tone: "success" }, pending: { label: "Pendiente", tone: "warning" },
};
type Filter = "all" | TimelineType;

function Row({ item, redacted }: { item: TimelineItem; redacted: boolean }) {
  const navigate = useNavigate();
  const time = new Date(item.occurred_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  if (item.type === "consultation" && item.consultation) {
    const c = item.consultation;
    const st = STATUS[c.status];
    const body = (
      <>
        <span className="tl-icon is-consult" aria-hidden="true"><Stethoscope size={16} /></span>
        <span className="tl-copy">
          <span className="tl-head"><strong>{redacted ? "Consulta" : c.chief_complaint || c.reason || "Consulta"}</strong>{st && <Pill tone={st.tone}>{c.amendment_count && c.status === "amended" ? `${st.label} (${c.amendment_count})` : st.label}</Pill>}</span>
          {!redacted && c.assessment && <span className="tl-text">{c.assessment}</span>}
          {!redacted && c.plan && <span className="tl-text is-muted">Plan: {c.plan}</span>}
          {!redacted && c.diagnoses.length > 0 && (
            <span className="tl-codes">{c.diagnoses.map((d) => <span key={d.code} className="code-pill" title={d.description}>{d.code}</span>)}</span>
          )}
          <span className="tl-meta">{time}{item.doctor_name ? ` · ${item.doctor_name}` : ""}</span>
        </span>
        {!redacted && <ChevronRight size={18} className="tl-chevron" aria-hidden="true" />}
      </>
    );
    return redacted ? <div className="tl-item">{body}</div> : <button type="button" className="tl-item is-link" onClick={() => navigate(`/consultations/${item.id}`)}>{body}</button>;
  }
  if (item.type === "prescription" && item.prescription) {
    const p = item.prescription;
    return (
      <div className="tl-item">
        <span className="tl-icon is-rx" aria-hidden="true"><PillIcon size={16} /></span>
        <span className="tl-copy">
          <span className="tl-head"><strong>{p.medication}{p.dosage ? ` · ${p.dosage}` : ""}</strong>{STATUS[p.status] && <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>}</span>
          {p.instructions && <span className="tl-text">{p.instructions}</span>}
          <span className="tl-meta">Prescripción · {time}</span>
        </span>
      </div>
    );
  }
  if (item.type === "document" && item.document) {
    const d = item.document;
    return (
      <div className="tl-item">
        <span className="tl-icon is-doc" aria-hidden="true"><FileText size={16} /></span>
        <span className="tl-copy">
          <span className="tl-head"><strong>{d.title}</strong>{STATUS[d.review_status] && <Pill tone={STATUS[d.review_status].tone}>{STATUS[d.review_status].label}</Pill>}</span>
          <span className="tl-meta">Documento{d.document_type_code ? ` · ${d.document_type_code}` : ""} · {time}</span>
        </span>
      </div>
    );
  }
  return null;
}

/** Day-grouped clinical timeline (Fase 1 format). Secretaries get a redacted view. */
export default function PatientTimeline({ patientId }: { patientId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patient-timeline", patientId, filter],
    queryFn: () => patientsEndpoints.getTimeline(patientId, { types: filter === "all" ? [] : [filter], pageSize: 50 }),
  });
  return (
    <section className="patient-profile-section tl" aria-labelledby="tl-title">
      <div className="patient-profile-section-head">
        <h3 id="tl-title">Línea de tiempo</h3>
        {data && <span>{data.total} eventos</span>}
      </div>
      <SegmentedControl label="Tipo de evento" value={filter} onChange={setFilter} className="tl-filter"
        segments={[{ value: "all", label: "Todo" }, { value: "consultation", label: "Consultas" }, { value: "prescription", label: "Recetas" }, { value: "document", label: "Docs." }]} />
      {data?.redacted && <p className="tl-redacted">Vista limitada: tu rol no ve el contenido clínico.</p>}
      {isLoading ? <div className="card-skeleton">{[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 72 }} />)}</div>
        : isError ? <InlineState kind="error" message="No se pudo cargar la línea de tiempo." onRetry={() => void refetch()} />
        : !data?.groups.length ? <InlineState message="Sin eventos clínicos registrados." />
        : (
          <ol className="tl-groups">
            {data.groups.map((g) => (
              <li key={g.date} className="tl-group">
                <h4 className="tl-date">{formatDate(g.date, "EEEE, d 'de' MMMM yyyy")}</h4>
                <div className="tl-items">{g.items.map((it) => <Row key={it.id} item={it} redacted={data.redacted} />)}</div>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
