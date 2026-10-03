import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Pill as PillIcon, ShieldAlert, Stethoscope, User } from "lucide-react";
import { diagnosesEndpoints, patientsEndpoints, soapEndpoints } from "../../../services/endpoints";
import type { ConsultationRead } from "../../../types/clinical";
import { ageFrom, label } from "../../../utils/labels";
import { formatDate } from "../../../utils/format";

interface Props {
  consultation: ConsultationRead;
  /** Desktop: collapsed to a slim rail. Phones/tablets: collapsed to a one-line summary card. */
  collapsed: boolean;
  onToggle: () => void;
  /** Single-column layout (≤1100px): renders as an expandable card above the note. */
  stacked: boolean;
}

interface Dx { code: string; description: string }

/** What the doctor needs to see while writing: who the patient is, what they have, what was done last time. */
export default function PatientContext({ consultation, collapsed, onToggle, stacked }: Props) {
  const pid = consultation.patient_id;
  const profile = useQuery({ queryKey: ["patient-profile", pid], queryFn: () => patientsEndpoints.getProfile(pid), staleTime: 2 * 60 * 1000, retry: 1 });
  const history = useQuery({ queryKey: ["patient-consultations", pid], queryFn: () => soapEndpoints.listByPatient(pid), staleTime: 60 * 1000 });
  const previous = (history.data ?? [])
    .filter((c) => c.id !== consultation.id && c.status !== "draft")
    .sort((a, b) => b.consultation_date.localeCompare(a.consultation_date));
  const last = previous[0];
  const recent = previous.slice(0, 3);
  const dxQueries = useQueries({
    queries: recent.map((c) => ({ queryKey: ["consultation-diagnoses", c.id], queryFn: () => diagnosesEndpoints.list(c.id), staleTime: 5 * 60 * 1000 })),
  });

  const patient = profile.data?.patient;
  const conditions = profile.data?.active_conditions ?? [];
  const active: Dx[] = [];
  const seen = new Set<string>();
  dxQueries.forEach((q) => q.data?.forEach((d) => { if (!seen.has(d.code)) { seen.add(d.code); active.push({ code: d.code, description: d.description }); } }));
  conditions.filter((c) => c.condition_type === "diagnosis" && c.normalized_system === "ICD10" && c.normalized_code).forEach((c) => {
    if (!seen.has(c.normalized_code!)) { seen.add(c.normalized_code!); active.push({ code: c.normalized_code!, description: c.name }); }
  });
  const lastDx = dxQueries[0]?.data ?? [];
  const meds = (profile.data?.active_prescriptions ?? []).filter((r) => r.status === "active");
  const allergies = conditions.filter((c) => c.condition_type === "allergy");
  const age = ageFrom(patient?.birth_date);
  const identity = [age !== null ? `${age} años` : null, patient?.gender ? label("sex", patient.gender) : null].filter(Boolean).join(" · ");
  const summary = [identity, active.length ? `${active.length} ${active.length === 1 ? "diagnóstico activo" : "diagnósticos activos"}` : null].filter(Boolean).join(" · ");

  if (!stacked && collapsed) {
    return (
      <aside className="consult-context is-rail" aria-label="Contexto del paciente">
        <button type="button" className="consult-context-toggle" onClick={onToggle} aria-expanded={false} aria-label="Mostrar contexto del paciente" title="Mostrar contexto del paciente">
          <PanelLeftOpen size={20} aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside className={clsx("consult-context", stacked && "is-stacked", stacked && collapsed && "is-collapsed")} aria-label="Contexto del paciente">
      <div className="consult-context-head">
        {stacked ? (
          <button type="button" className="consult-context-summary" onClick={onToggle} aria-expanded={!collapsed}>
            <span className="consult-context-summary-copy">
              <span className="consult-context-title">Contexto del paciente</span>
              <span className="consult-context-sub">{summary || "Edad, diagnósticos, última consulta y medicación"}</span>
            </span>
            {collapsed ? <ChevronRight size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
          </button>
        ) : (
          <>
            <h2 className="consult-context-title">Contexto del paciente</h2>
            <button type="button" className="consult-context-toggle" onClick={onToggle} aria-expanded={true} aria-label="Ocultar contexto del paciente" title="Ocultar contexto">
              <PanelLeftClose size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {!(stacked && collapsed) && (
        <div className="consult-context-body">
          <section className="ctx-block">
            <h3 className="ctx-label"><User size={14} aria-hidden="true" />Paciente</h3>
            {profile.isLoading ? <span className="skeleton" style={{ height: 20, width: "70%" }} /> : (
              <p className="ctx-strong">{identity || "Edad y sexo sin registrar"}</p>
            )}
          </section>

          <section className="ctx-block">
            <h3 className="ctx-label"><Stethoscope size={14} aria-hidden="true" />Diagnósticos activos</h3>
            {active.length ? (
              <ul className="ctx-dx">
                {active.slice(0, 6).map((d) => (
                  <li key={d.code}><span className="code-pill">{d.code}</span><span className="ctx-dx-desc" title={d.description}>{d.description}</span></li>
                ))}
              </ul>
            ) : <p className="ctx-empty">Aún no hay diagnósticos codificados. Agrega el primero en el panel CIE-10.</p>}
          </section>

          <section className="ctx-block">
            <h3 className="ctx-label">Última consulta</h3>
            {history.isLoading ? <span className="skeleton" style={{ height: 48 }} /> : last ? (
              <Link to={`/consultations/${last.id}`} className="ctx-last">
                <span className="ctx-last-date">{formatDate(last.consultation_date)}</span>
                {(last.chief_complaint || last.reason) && <span><b>Motivo:</b> {last.chief_complaint || last.reason}</span>}
                {last.assessment && <span><b>Evaluación:</b> {last.assessment}</span>}
                {last.plan && <span><b>Plan:</b> {last.plan}</span>}
                {lastDx.length > 0 && <span className="ctx-last-codes">{lastDx.map((d) => <span key={d.id} className="code-pill">{d.code}</span>)}</span>}
              </Link>
            ) : <p className="ctx-empty">Es la primera consulta firmada de este paciente.</p>}
          </section>

          <section className="ctx-block">
            <h3 className="ctx-label"><PillIcon size={14} aria-hidden="true" />Medicación actual</h3>
            {meds.length ? (
              <ul className="ctx-list">
                {meds.map((m) => <li key={m.id}><strong>{m.medication}</strong>{m.dosage ? ` · ${m.dosage}` : ""}</li>)}
              </ul>
            ) : <p className="ctx-empty">Sin medicación activa registrada. Anótala en Plan.</p>}
          </section>

          <section className="ctx-block">
            <h3 className="ctx-label"><ShieldAlert size={14} aria-hidden="true" />Alergias</h3>
            {allergies.length ? (
              <ul className="ctx-list is-alert">{allergies.map((a) => <li key={a.id}>{a.name}</li>)}</ul>
            ) : <p className="ctx-empty">Sin alergias registradas. Si las hay, anótalas en Antecedentes.</p>}
          </section>
        </div>
      )}
    </aside>
  );
}
