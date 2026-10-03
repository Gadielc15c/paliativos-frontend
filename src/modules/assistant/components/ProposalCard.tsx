import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import Button from "../../../components/common/Button";
import AiPill from "../../../components/clinical/AiPill";
import CodePill from "../../../components/clinical/CodePill";
import { agentEndpoints } from "../../../services/endpoints/agent";
import { agentErrorMessage, useAssistant } from "../store";
import type { AgentProposal } from "../../../types/agent";

const DOC_TYPES: Array<[string, string]> = [
  ["lab_result", "Resultado de laboratorio"], ["prescription", "Receta"], ["id_card", "Documento de identidad"],
  ["clinical_report", "Informe clínico"], ["imaging", "Imagen o estudio"], ["other", "Otro documento"],
];
const PATIENT_FIELDS: Array<[string, string, string?]> = [
  ["first_name", "Nombre"], ["last_name", "Apellidos"], ["document_number", "Documento"], ["birth_date", "Fecha de nacimiento", "date"],
  ["gender", "Sexo"], ["phone", "Teléfono", "tel"], ["address", "Dirección"], ["insurer_name", "Aseguradora"],
];
const SOAP: Array<[string, string]> = [["subjective", "Motivo y relato"], ["objective", "Examen físico"], ["assessment", "Evaluación"], ["plan", "Plan"]];
const GENDER: Record<string, string> = { female: "Mujer", male: "Hombre", F: "Mujer", M: "Hombre" };

type Fields = Record<string, string>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Normalizes the editable part of each proposal type into flat string fields. */
function initialFields(p: AgentProposal): Fields {
  const pl = p.payload ?? {};
  if (p.type === "attach_document") return { title: str(pl.title), document_type: str(pl.document_type) };
  if (p.type === "apply_extraction") {
    const f = pl.fields;
    if (Array.isArray(f)) return Object.fromEntries(f.map((x: { key: string; value: unknown }) => [x.key, str(x.value)]));
    if (f && typeof f === "object") return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, str(v)]));
    return {};
  }
  if (p.type === "create_patient") return Object.fromEntries(PATIENT_FIELDS.filter(([k]) => k in pl).map(([k]) => [k, str(pl[k])]));
  if (p.type === "draft_consultation_note") {
    const soap = (pl.soap ?? {}) as Record<string, unknown>;
    return Object.fromEntries(SOAP.filter(([k]) => k in soap).map(([k]) => [k, str(soap[k])]));
  }
  return {};
}
const fieldLabel = (p: AgentProposal, key: string) => {
  if (p.type === "apply_extraction" && Array.isArray(p.payload.fields)) return (p.payload.fields as Array<{ key: string; label?: string }>).find((f) => f.key === key)?.label ?? key;
  return key;
};

/** Where to go after the write landed. */
function resultLinks(p: AgentProposal): Array<{ to: string; label: string }> {
  const r = { ...(p.payload ?? {}), ...(p.result ?? {}) } as Record<string, unknown>;
  const patientId = r.patient_id ? String(r.patient_id) : null;
  const links: Array<{ to: string; label: string }> = [];
  if (r.consultation_id) links.push({ to: `/consultations/${r.consultation_id}`, label: "Abrir la consulta" });
  if (r.document_id && (p.type === "attach_document" || p.type === "apply_extraction"))
    links.push({ to: patientId ? `/patients?patientId=${patientId}&focus=1&tab=documents` : `/documents?documentId=${r.document_id}`, label: "Ver documento" });
  if (patientId && !links.length) links.push({ to: `/patients?patientId=${patientId}&focus=1`, label: "Ver ficha" });
  return links;
}

const DONE_TEXT: Record<string, string> = {
  attach_document: "Documento guardado en la ficha.",
  apply_extraction: "Datos revisados y guardados con el documento.",
  create_patient: "Paciente creado.",
  draft_consultation_note: "Borrador de consulta creado. Revísalo y fírmalo.",
};

export default function ProposalCard({ proposal: p, messageId }: { proposal: AgentProposal; messageId: string }) {
  const updateProposal = useAssistant((s) => s.updateProposal);
  const id = useId();
  const [initial] = useState(() => initialFields(p));
  const [fields, setFields] = useState<Fields>(initial);
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null);
  // Long proposals read as a summary first; inputs appear only when the user wants to correct.
  const collapsible = p.type === "apply_extraction" || p.type === "draft_consultation_note";
  const [editing, setEditing] = useState(!collapsible);
  const patientName = str(p.payload?.patient_name);
  const set = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));

  /** Backend deep-merges `edits` into the payload, so edits mirror the payload's shape. */
  const edits = (): Record<string, unknown> | undefined => {
    const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => v !== initial[k]));
    if (!Object.keys(changed).length) return undefined;
    if (p.type === "draft_consultation_note") return { soap: changed };
    if (p.type === "apply_extraction") {
      const f = p.payload.fields;
      if (Array.isArray(f)) return { fields: f.map((x: { key: string }) => (x.key in changed ? { ...x, value: changed[x.key] } : x)) };
      return { fields: { ...(f as object), ...changed } };
    }
    return changed;
  };
  const confirm = async () => {
    setBusy("confirm");
    try {
      const res = await agentEndpoints.confirm(p.id, edits());
      updateProposal(messageId, p.id, { status: "applied", result: res.result ?? {} });
      toast.success(DONE_TEXT[p.type] ?? "Cambio aplicado.");
    } catch (e) {
      toast.error(`No se pudo confirmar. ${agentErrorMessage(e)}`, { action: { label: "Reintentar", onClick: () => void confirm() } });
    } finally { setBusy(null); }
  };
  const reject = async () => {
    setBusy("reject");
    try {
      await agentEndpoints.reject(p.id);
      updateProposal(messageId, p.id, { status: "rejected" });
    } catch (e) {
      toast.error(`No se pudo descartar. ${agentErrorMessage(e)}`);
    } finally { setBusy(null); }
  };

  if (p.status === "rejected") {
    return (
      <div className="as-proposal is-rejected" role="status">
        <XCircle size={18} aria-hidden="true" />
        <span><strong>{p.title}</strong> · Descartado. No se guardó nada.</span>
      </div>
    );
  }
  if (p.status === "applied") {
    const links = resultLinks(p);
    return (
      <section className="as-proposal is-applied" aria-label={`${p.title}: aplicado`}>
        <p className="as-proposal-done"><CheckCircle2 size={18} aria-hidden="true" /><span><strong>{p.title}</strong> · {typeof p.result?.note === "string" ? p.result.note : DONE_TEXT[p.type] ?? "Aplicado."}</span></p>
        {links.length > 0 && (
          <div className="as-proposal-links">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="button button-tinted button-sm as-link-button"><span className="button-content">{l.label}<ChevronRight size={16} aria-hidden="true" /></span></Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  const icd = Array.isArray(p.payload?.icd10) ? (p.payload.icd10 as Array<{ code: string; description?: string } | string>) : [];
  return (
    <section className="as-proposal is-pending" aria-labelledby={`${id}-t`}>
      <div className="as-proposal-top"><AiPill>IA · Pendiente de confirmación</AiPill></div>
      <h3 id={`${id}-t`} className="as-proposal-title">{p.title}</h3>
      {(p.description || patientName) && (
        <p className="as-proposal-desc">{p.description}{p.description && patientName ? " " : ""}{patientName && !p.description?.includes(patientName) ? <>Paciente: <strong>{patientName}</strong>.</> : null}</p>
      )}
      <p className="as-proposal-note">
        {p.type === "apply_extraction" && !p.payload?.document_id && p.payload?.file_ref ? "Al confirmar, primero se guarda el archivo en Documentos del paciente. " : ""}
        Se escribirá en la historia solo si confirmas. Puedes corregir los datos antes.
      </p>

      <div className={(p.type === "apply_extraction" && editing) || p.type === "create_patient" || p.type === "attach_document" ? "as-proposal-fields is-grid" : "as-proposal-fields"}>
        {p.type === "attach_document" && (
          <>
            <label className="as-input-row"><span>Título</span>
              <input className="as-input" value={fields.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
            <label className="as-input-row"><span>Tipo de documento</span>
              <select className="as-input" value={fields.document_type ?? ""} onChange={(e) => set("document_type", e.target.value)}>
                {!DOC_TYPES.some(([v]) => v === fields.document_type) && <option value={fields.document_type}>{fields.document_type || "Elegir…"}</option>}
                {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </>
        )}
        {p.type === "apply_extraction" && (editing ? Object.keys(fields).map((k) => (
          <label key={k} className="as-input-row"><span>{fieldLabel(p, k)}</span>
            <input className="as-input" value={fields[k]} onChange={(e) => set(k, e.target.value)} /></label>
        )) : (
          <dl className="as-summary">
            {Object.keys(fields).map((k) => <div key={k}><dt>{fieldLabel(p, k)}</dt><dd>{fields[k] || "—"}</dd></div>)}
          </dl>
        ))}
        {p.type === "create_patient" && PATIENT_FIELDS.filter(([k]) => k in fields).map(([k, l, type]) => (
          <label key={k} className="as-input-row"><span>{l}</span>
            {k === "gender" ? (
              <select className="as-input" value={fields[k]} onChange={(e) => set(k, e.target.value)}>
                {!GENDER[fields[k]] && <option value={fields[k]}>{fields[k] || "Sin dato"}</option>}
                <option value="female">Mujer</option><option value="male">Hombre</option>
              </select>
            ) : <input className="as-input" type={type ?? "text"} value={fields[k]} onChange={(e) => set(k, e.target.value)} />}
          </label>
        ))}
        {p.type === "draft_consultation_note" && (
          <>
            {SOAP.filter(([k]) => k in fields).map(([k, l]) => editing ? (
              <label key={k} className="as-input-row"><span>{l}</span>
                <textarea className="as-input as-textarea" rows={3} value={fields[k]} onChange={(e) => set(k, e.target.value)} /></label>
            ) : (
              <div key={k} className="as-input-row"><span>{l}</span><p className="as-soap-text">{fields[k] || "—"}</p></div>
            ))}
            {icd.length > 0 && (
              <div className="as-input-row"><span>Diagnósticos CIE-10</span>
                <div className="code-chip-list">{icd.map((c) => typeof c === "string" ? <CodePill key={c} code={c} /> : <CodePill key={c.code} code={c.code} description={c.description} />)}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="as-proposal-actions">
        <Button variant="primary" size="sm" onClick={() => void confirm()} disabled={!!busy} aria-busy={busy === "confirm" || undefined}>
          {busy === "confirm" ? "Confirmando…" : "Confirmar"}
        </Button>
        <Button variant="gray" size="sm" onClick={() => void reject()} disabled={!!busy}>Descartar</Button>
        {collapsible && !editing && <Button variant="plain" size="sm" onClick={() => setEditing(true)} disabled={!!busy}>Corregir antes</Button>}
      </div>
    </section>
  );
}
