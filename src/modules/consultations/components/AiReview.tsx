import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Info, Pencil, Quote, RotateCcw, X } from "lucide-react";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import AiPill from "../../../components/clinical/AiPill";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { SOAP_FIELDS, SOAP_LABELS, type AiDraftNote, type SoapField } from "../../../types/clinical";

type FieldStatus = "pending" | "accepted" | "editing" | "discarded";
type CodeStatus = "pending" | "added" | "discarded";

export interface ReviewDecision {
  soap: Partial<Record<SoapField, string>>;
  codes: string[];
  edited: boolean;
}

interface Props {
  draft: AiDraftNote;
  current: Record<SoapField, string>;
  existingCodes: string[];
  applying: boolean;
  onApply: (d: ReviewDecision) => void;
  onDiscardAll: () => void;
}

/** Step 2: review. Side-by-side on desktop, one decision per step on phones. Nothing is saved until "Aplicar". */
export default function AiReview({ draft, current, existingCodes, applying, onApply, onDiscardAll }: Props) {
  const compact = useIsCompact();
  const proposed = useMemo(() => SOAP_FIELDS.filter((f) => draft.soap[f]?.trim()), [draft]);
  const [fields, setFields] = useState<Record<string, { status: FieldStatus; text: string }>>(
    () => Object.fromEntries(proposed.map((f) => [f, { status: "pending" as FieldStatus, text: draft.soap[f] ?? "" }]))
  );
  const [codes, setCodes] = useState<Record<string, CodeStatus>>(
    () => Object.fromEntries(draft.icd10_suggestions.map((s) => [s.code, existingCodes.includes(s.code) ? "discarded" as CodeStatus : "pending" as CodeStatus]))
  );
  const [step, setStep] = useState(0);

  const setField = (f: SoapField, patch: Partial<{ status: FieldStatus; text: string }>) => setFields((s) => ({ ...s, [f]: { ...s[f], ...patch } }));
  const accepted = proposed.filter((f) => fields[f].status === "accepted");
  const added = Object.entries(codes).filter(([, s]) => s === "added").map(([c]) => c);
  const pendingCount = proposed.filter((f) => fields[f].status === "pending" || fields[f].status === "editing").length + Object.values(codes).filter((s) => s === "pending").length;
  const total = proposed.length + draft.icd10_suggestions.length;
  const nothing = accepted.length === 0 && added.length === 0;

  const apply = () => onApply({
    soap: Object.fromEntries(accepted.map((f) => [f, fields[f].text.trim()])),
    codes: added,
    edited: accepted.some((f) => fields[f].text.trim() !== (draft.soap[f] ?? "").trim()),
  });

  const fieldCard = (f: SoapField, opts: { showCurrent: boolean }) => {
    const st = fields[f];
    const cur = current[f]?.trim();
    return (
      <div className={clsx("ai-proposal", `is-${st.status}`)} data-tone={st.status === "pending" || st.status === "editing" ? "ai" : undefined}>
        <div className="ai-proposal-head">
          <h3 className="ai-proposal-title">{SOAP_LABELS[f]}</h3>
          {st.status === "accepted" ? <Pill tone="success">Aceptado</Pill> : st.status === "discarded" ? <Pill tone="neutral">Descartado</Pill> : <AiPill>Generado con IA · Pendiente de revisión</AiPill>}
        </div>
        {opts.showCurrent && (
          <div className="ai-proposal-current">
            <span className="ai-proposal-caption">Tu nota actual</span>
            <p>{cur || <em>Vacío</em>}</p>
          </div>
        )}
        {st.status === "editing" ? (
          <label className="ai-proposal-edit">
            <span className="sr-only">Editar {SOAP_LABELS[f]}</span>
            <textarea rows={Math.min(10, Math.max(3, Math.ceil(st.text.length / 60)))} value={st.text} onChange={(e) => setField(f, { text: e.target.value })} autoFocus />
          </label>
        ) : (
          <p className={clsx("ai-proposal-text", st.status === "discarded" && "is-struck")}>{st.text}</p>
        )}
        {cur && st.status !== "discarded" && <p className="ai-proposal-note"><Info size={14} aria-hidden="true" />Al aceptar, reemplaza el texto actual de esta sección.</p>}
        {!compact && (
          <div className="ai-proposal-actions">
            {st.status === "editing" ? (
              <Button size="sm" variant="primary" onClick={() => setField(f, { status: "accepted" })} disabled={!st.text.trim()}><Check size={16} aria-hidden="true" /><span>Guardar edición</span></Button>
            ) : st.status === "pending" ? (
              <>
                <Button size="sm" variant="tinted" onClick={() => setField(f, { status: "accepted" })}><Check size={16} aria-hidden="true" /><span>Aceptar</span></Button>
                <Button size="sm" variant="gray" onClick={() => setField(f, { status: "editing" })}><Pencil size={16} aria-hidden="true" /><span>Editar</span></Button>
                <Button size="sm" variant="plain" onClick={() => setField(f, { status: "discarded" })}><X size={16} aria-hidden="true" /><span>Descartar</span></Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="plain" onClick={() => setField(f, { status: "pending", text: st.status === "discarded" ? st.text : st.text })}><RotateCcw size={16} aria-hidden="true" /><span>Deshacer</span></Button>
                {st.status === "accepted" && <Button size="sm" variant="gray" onClick={() => setField(f, { status: "editing" })}><Pencil size={16} aria-hidden="true" /><span>Editar</span></Button>}
              </>
            )}
          </div>
        )}
        {compact && st.status === "pending" && (
          <div className="ai-proposal-actions"><Button size="sm" variant="gray" onClick={() => setField(f, { status: "editing" })}><Pencil size={16} aria-hidden="true" /><span>Editar antes de aceptar</span></Button></div>
        )}
        {compact && st.status !== "pending" && st.status !== "editing" && (
          <div className="ai-proposal-actions"><Button size="sm" variant="plain" onClick={() => setField(f, { status: "pending" })}><RotateCcw size={16} aria-hidden="true" /><span>Deshacer</span></Button></div>
        )}
      </div>
    );
  };

  const codeCards = (
    <div className="ai-codes">
      {draft.icd10_suggestions.map((s) => {
        const st = codes[s.code];
        const already = existingCodes.includes(s.code);
        return (
          <article key={s.code} className={clsx("ai-code-card", `is-${st}`)}>
            <div className="ai-code-head">
              <span className="code-pill">{s.code}</span>
              <strong className="ai-code-desc">{s.description}</strong>
            </div>
            <p className="ai-code-rationale">{s.rationale}</p>
            {s.evidence && (
              <blockquote className="ai-code-evidence">
                <Quote size={14} aria-hidden="true" />
                <span>{s.evidence}</span>
              </blockquote>
            )}
            <div className="ai-code-meta">
              {s.evidence_verified ? <Pill tone="success">Evidencia en la nota</Pill> : <Pill tone="warning">Sin cita verificada</Pill>}
              {s.source === "catalog_search" && <Pill tone="neutral">Buscado en catálogo</Pill>}
            </div>
            <div className="ai-code-actions">
              {already ? <Pill tone="neutral">Ya está en la consulta</Pill> : st === "pending" ? (
                <>
                  <Button size="sm" variant="tinted" onClick={() => setCodes((c) => ({ ...c, [s.code]: "added" }))}><Check size={16} aria-hidden="true" /><span>Agregar</span></Button>
                  <Button size="sm" variant="plain" onClick={() => setCodes((c) => ({ ...c, [s.code]: "discarded" }))}><X size={16} aria-hidden="true" /><span>Descartar</span></Button>
                </>
              ) : (
                <>
                  <Pill tone={st === "added" ? "success" : "neutral"}>{st === "added" ? "Se agregará" : "Descartado"}</Pill>
                  <Button size="sm" variant="plain" onClick={() => setCodes((c) => ({ ...c, [s.code]: "pending" }))}><RotateCcw size={16} aria-hidden="true" /><span>Deshacer</span></Button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );

  const header = (
    <div className="ai-review-head">
      <div className="ai-review-heading">
        <h2 className="ai-card-title">Revisión del borrador <AiPill /></h2>
        <p className="ai-meta">
          {total - pendingCount} de {total} revisados · {draft.provider === "offline" ? "Asistente local (sin conexión externa)" : `${draft.provider} · ${draft.model}`}
          {draft.fallback && " · respaldo local"}
          {Object.keys(draft.deidentified).length > 0 && ` · ${Object.values(draft.deidentified).reduce((a, b) => a + b, 0)} datos personales anonimizados`}
        </p>
      </div>
    </div>
  );
  const disclaimer = <p className="ai-disclaimer"><Info size={14} aria-hidden="true" />{draft.disclaimer_text}</p>;
  const summaryText = nothing ? "No has aceptado nada todavía" : `${accepted.length} ${accepted.length === 1 ? "sección" : "secciones"} y ${added.length} ${added.length === 1 ? "código" : "códigos"} por aplicar`;

  // ---------------------------------------------------------------- phones
  if (compact) {
    const steps: Array<{ kind: "field"; f: SoapField } | { kind: "codes" } | { kind: "summary" }> = [
      ...proposed.map((f) => ({ kind: "field" as const, f })),
      ...(draft.icd10_suggestions.length ? [{ kind: "codes" as const }] : []),
      { kind: "summary" as const },
    ];
    const i = Math.min(step, steps.length - 1);
    const s = steps[i];
    const next = () => setStep(Math.min(i + 1, steps.length - 1));
    const decide = (status: FieldStatus) => { if (s.kind === "field") { setField(s.f, { status }); next(); } };
    return (
      <section className="ai-review is-stepped" aria-label="Revisión del borrador de IA">
        {header}
        <div className="ai-steps" aria-label={`Paso ${i + 1} de ${steps.length}`}>
          {steps.map((st, k) => (
            <button key={k} type="button" className={clsx("ai-step-dot", k === i && "is-current", k < i && "is-done")} onClick={() => setStep(k)}
              aria-label={`Ir al paso ${k + 1}: ${st.kind === "field" ? SOAP_LABELS[st.f] : st.kind === "codes" ? "Códigos CIE-10" : "Resumen"}`} aria-current={k === i ? "step" : undefined} />
          ))}
        </div>
        <p className="ai-step-label">Paso {i + 1} de {steps.length} · {s.kind === "field" ? SOAP_LABELS[s.f] : s.kind === "codes" ? "Códigos CIE-10 sugeridos" : "Resumen"}</p>
        <div className="ai-step-body" key={i}>
          {s.kind === "field" && fieldCard(s.f, { showCurrent: true })}
          {s.kind === "codes" && codeCards}
          {s.kind === "summary" && (
            <div className="ai-summary">
              <CheckCircle2 size={28} aria-hidden="true" />
              <p className="ai-summary-title">{summaryText}</p>
              <ul className="ai-summary-list">
                {accepted.map((f) => <li key={f}>{SOAP_LABELS[f]}</li>)}
                {added.map((c) => <li key={c}><span className="code-pill">{c}</span></li>)}
              </ul>
              {disclaimer}
            </div>
          )}
        </div>
        <div className="ai-review-bar">
          {s.kind === "field" && fields[s.f].status === "editing" ? (
            <>
              <Button variant="gray" onClick={() => setField(s.f, { status: "pending", text: draft.soap[s.f] ?? "" })}>Cancelar</Button>
              <Button variant="primary" onClick={() => decide("accepted")} disabled={!fields[s.f].text.trim()}>Aceptar edición</Button>
            </>
          ) : s.kind === "field" ? (
            <>
              <Button variant="gray" onClick={() => decide("discarded")}><X size={18} aria-hidden="true" /><span>Descartar</span></Button>
              <Button variant="primary" onClick={() => decide("accepted")}><Check size={18} aria-hidden="true" /><span>Aceptar</span></Button>
            </>
          ) : s.kind === "codes" ? (
            <>
              <Button variant="gray" onClick={() => setStep(Math.max(0, i - 1))}><ChevronLeft size={18} aria-hidden="true" /><span>Atrás</span></Button>
              <Button variant="primary" onClick={next}><span>Continuar</span><ChevronRight size={18} aria-hidden="true" /></Button>
            </>
          ) : (
            <>
              <Button variant="gray" onClick={onDiscardAll} disabled={applying}>Descartar todo</Button>
              <Button variant="primary" className="glow-border" onClick={apply} isLoading={applying} disabled={nothing}>Aplicar a la nota</Button>
            </>
          )}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- desktop
  return (
    <section className="ai-review" aria-label="Revisión del borrador de IA">
      {header}
      <div className="ai-compare">
        <div className="ai-compare-labels" aria-hidden="true"><span>Tu nota</span><span>Propuesta de IA</span></div>
        {proposed.length === 0 && <p className="ai-meta">La IA no propuso texto para ninguna sección SOAP.</p>}
        {proposed.map((f) => (
          <div key={f} className="ai-compare-row">
            <div className="ai-compare-current">
              <span className="ai-proposal-caption">{SOAP_LABELS[f]}</span>
              <p>{current[f]?.trim() || <em>Vacío</em>}</p>
            </div>
            {fieldCard(f, { showCurrent: false })}
          </div>
        ))}
      </div>
      {draft.icd10_suggestions.length > 0 && (
        <div className="ai-codes-section">
          <h3 className="ai-section-title">Códigos CIE-10 sugeridos</h3>
          {codeCards}
        </div>
      )}
      {disclaimer}
      <div className="ai-review-bar">
        <span className="ai-review-summary">{summaryText}{pendingCount > 0 && ` · ${pendingCount} sin revisar`}</span>
        <Button variant="gray" onClick={onDiscardAll} disabled={applying}>Descartar todo</Button>
        <Button variant="primary" className="glow-border" onClick={apply} isLoading={applying} disabled={nothing}>Aplicar a la nota</Button>
      </div>
    </section>
  );
}
