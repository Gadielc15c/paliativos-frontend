import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Check, CloudOff, FilePlus2, Loader2, Lock, Mic, PenLine, Sparkles } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import Sheet from "../../../components/common/Sheet";
import InlineState from "../../../components/clinical/InlineState";
import { aiEndpoints, diagnosesEndpoints, patientsEndpoints, soapEndpoints } from "../../../services/endpoints";
import { usePermission } from "../../../utils/usePermission";
import { SOAP_FIELDS, SOAP_LABELS, type AiDraftNote, type AiTranscription, type ConsultationRead, type SoapField } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";
import { formatDateTime } from "../../../utils/format";
import { useSoapAutosave, isConflict, type SaveState } from "../components/useSoapAutosave";
import DiagnosesCard from "../components/DiagnosesCard";
import AiComposeSheet, { SAMPLE_NOTE } from "../components/AiComposeSheet";
import AiReview, { type ReviewDecision } from "../components/AiReview";
import ConsultationRecorder, { ensureRecordable } from "../components/ConsultationRecorder";
import PatientContext from "../components/PatientContext";
import AutoTextarea from "../components/AutoTextarea";
import { useMediaQuery } from "../../../components/common/useMediaQuery";
import "../../../components/clinical/clinical.css";
import "./ConsultationPage.css";

const STATUS: Record<ConsultationRead["status"], { label: string; tone: "warning" | "success" | "info" }> = {
  draft: { label: "Borrador", tone: "warning" },
  signed: { label: "Firmada", tone: "success" },
  amended: { label: "Firmada con enmiendas", tone: "info" },
};
/** Minimum to sign: why they came, what you think, what you will do — plus one CIE-10 code. */
const REQUIRED: SoapField[] = ["chief_complaint", "assessment", "plan"];
const HINTS: Record<SoapField, string> = {
  chief_complaint: "¿Por qué consulta hoy?",
  history_present_illness: "Evolución, síntomas, escalas de dolor…",
  past_history: "Antecedentes relevantes, alergias, medicación previa…",
  physical_exam: "Signos vitales y hallazgos",
  assessment: "Impresión clínica",
  plan: "Indicaciones, ajustes de tratamiento, próximo control",
};

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  const time = savedAt?.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  const map: Record<SaveState, { icon: JSX.Element; text: string }> = {
    idle: { icon: <Check size={14} />, text: "Guardado" },
    dirty: { icon: <PenLine size={14} />, text: "Cambios sin guardar" },
    saving: { icon: <Loader2 size={14} className="spin" />, text: "Guardando…" },
    saved: { icon: <Check size={14} />, text: time ? `Guardado · ${time}` : "Guardado" },
    error: { icon: <CloudOff size={14} />, text: "No se pudo guardar" },
    conflict: { icon: <AlertCircle size={14} />, text: "Versión desactualizada" },
  };
  const m = map[state];
  return <span className="save-indicator" data-state={state} role="status" aria-live="polite">{m.icon}<span>{m.text}</span></span>;
}

export default function ConsultationPage() {
  const { consultationId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canSign = usePermission("consultations:sign");
  const canWrite = usePermission("clinical:write");
  const canAi = usePermission("ai:use");
  const key = ["consultation", consultationId];

  const { data: consultation, isLoading, isError, error, refetch } = useQuery({ queryKey: key, queryFn: () => soapEndpoints.get(consultationId) });
  const { data: patient } = useQuery({ queryKey: ["patient", consultation?.patient_id], queryFn: () => patientsEndpoints.get(consultation!.patient_id), enabled: !!consultation?.patient_id, staleTime: 5 * 60 * 1000 });

  const onSaved = useCallback((c: ConsultationRead) => qc.setQueryData(key, c), [qc, consultationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => { const r = await refetch(); if (r.data) autosave.reseed(r.data); }, [refetch]); // eslint-disable-line react-hooks/exhaustive-deps
  const autosave = useSoapAutosave(consultation, onSaved, () => void reload());
  const { draft, setField, state, savedAt, flush } = autosave;

  const editable = consultation?.status === "draft" && canWrite;
  const [composeOpen, setComposeOpen] = useState(params.get("ai") === "compose");
  const [aiDraft, setAiDraft] = useState<AiDraftNote | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const { data: sttConfig, isError: sttError } = useQuery({
    queryKey: ["ai-transcription-config"], queryFn: aiEndpoints.transcriptionConfig,
    enabled: editable && canAi, staleTime: 5 * 60 * 1000, retry: false,
  });
  const sttAvailable = !!sttConfig?.available && !sttError;
  const canRecord = !!editable && canAi && sttAvailable;
  const sttReason = sttError || (sttConfig && !sttConfig.available) ? "La transcripción de audio no está configurada en este servidor." : undefined;
  const onTranscribed = useCallback((r: AiTranscription) => {
    qc.setQueryData<ConsultationRead>(key, (c) => c ? { ...c, transcript: r.transcript, transcript_info: { provider: r.provider, model: r.model, language: r.language, duration_seconds: r.duration_seconds, cost_estimate_usd: r.cost_estimate_usd, chunks: r.chunks_received, suggestion_id: r.suggestion_id, created_at: new Date().toISOString() } } : c);
  }, [qc, consultationId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openRecord = () => { if (ensureRecordable()) { setComposeOpen(false); setConsentOpen(true); } };
  const [amend, setAmend] = useState({ content: "", reason: "" });
  const stacked = useMediaQuery("(max-width: 1100px)");
  const [ctxCollapsed, setCtxCollapsed] = useState(() => window.matchMedia("(max-width: 1100px)").matches);
  const [transcriptEl, setTranscriptEl] = useState<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const { data: dx = [] } = useQuery({ queryKey: ["consultation-diagnoses", consultationId], queryFn: () => diagnosesEndpoints.list(consultationId) });
  const existingCodes = dx.map((d) => d.code);

  const draftNote = useMutation({
    mutationFn: ({ text, source }: { text: string; source: "free_text" | "transcript" }) => aiEndpoints.draftNote(consultationId, text, source),
    onSuccess: (d) => { setAiDraft(d); setComposeOpen(false); requestAnimationFrame(() => { const el = reviewRef.current; if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" }); }); },
    onError: (e) => toast.error((e as unknown as ApiError)?.code === "AI_DISABLED" ? "El asistente de IA está desactivado en este servidor." : (e as unknown as ApiError)?.message || "No se pudo generar el borrador."),
  });

  // Dev preview: ?ai=review opens the review with the sample note (screens can be checked without typing).
  const autoReview = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV && !autoReview.current && params.get("ai") === "review" && consultation?.status === "draft") { autoReview.current = true; draftNote.mutate({ text: SAMPLE_NOTE, source: "free_text" }); }
  }, [consultation?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAi = () => { setAiDraft(null); if (params.get("ai")) { const n = new URLSearchParams(params); n.delete("ai"); setParams(n, { replace: true }); } };

  const applyAi = useMutation({
    mutationFn: async (d: ReviewDecision) => {
      const version = await flush();
      const soap = Object.fromEntries(SOAP_FIELDS.map((f) => [f, d.soap[f] ?? ""])); // "" = not written by the backend
      return aiEndpoints.accept(aiDraft!.suggestion_id, { soap, icd10_codes: d.codes, version, apply: true });
    },
    onSuccess: async (_r, d) => {
      const fresh = await refetch();
      if (fresh.data) autosave.reseed(fresh.data);
      await qc.invalidateQueries({ queryKey: ["consultation-diagnoses", consultationId] });
      toast.success("Borrador aplicado a la nota", { description: `${Object.keys(d.soap).length} secciones y ${d.codes.length} códigos. Sigue siendo un borrador hasta que firmes.` });
      closeAi();
    },
    onError: (e) => toast.error(isConflict(e) ? "La nota cambió mientras revisabas. Recarga y vuelve a aplicar." : (e as unknown as ApiError)?.message || "No se pudo aplicar el borrador."),
  });
  const rejectAi = useMutation({
    mutationFn: () => aiEndpoints.reject(aiDraft!.suggestion_id, "Descartado por el médico"),
    onSettled: () => { toast("Borrador descartado", { description: "La nota no se modificó." }); closeAi(); },
  });

  const sign = useMutation({
    mutationFn: async () => soapEndpoints.sign(consultationId, await flush()),
    onSuccess: (c) => { qc.setQueryData(key, c); autosave.reseed(c); setSignOpen(false); toast.success("Nota firmada", { description: "A partir de ahora solo se pueden agregar enmiendas." }); },
    onError: (e) => toast.error((e as unknown as ApiError)?.message || "No se pudo firmar la nota."),
  });
  const addAmendment = useMutation({
    mutationFn: () => soapEndpoints.amend(consultationId, amend.content.trim(), amend.reason.trim()),
    onSuccess: (c) => { qc.setQueryData(key, c); setAmend({ content: "", reason: "" }); toast.success("Enmienda registrada"); },
    onError: (e) => toast.error((e as unknown as ApiError)?.message || "No se pudo registrar la enmienda."),
  });

  if (isLoading) {
    return <div className="data-screen consult-page"><div className="consult-skeleton">{[48, 120, 120, 120].map((h, i) => <span key={i} className="skeleton" style={{ height: h }} />)}</div></div>;
  }
  if (isError || !consultation) {
    return <div className="data-screen"><InlineState kind="error" message={(error as unknown as ApiError)?.message || "No se pudo abrir la consulta."} onRetry={() => void refetch()} /></div>;
  }

  const status = STATUS[consultation.status];
  const back = () => navigate(`/patients?patientId=${consultation.patient_id}&focus=1`);
  const hasContent = !!draft && SOAP_FIELDS.some((f) => draft[f].trim());
  const missing = [
    ...REQUIRED.filter((f) => !draft?.[f]?.trim()).map((f) => SOAP_LABELS[f]),
    ...(dx.length ? [] : ["un diagnóstico CIE-10"]),
  ];
  const ready = missing.length === 0;
  const missingText = ready ? "Todo listo para firmar." : `Falta: ${missing.join(", ")}.`;
  const reviewing = !!aiDraft || draftNote.isPending;
  const showStart = editable && !aiDraft && !draftNote.isPending;
  const signButton = (block?: boolean) => (
    <Button variant="primary" size={block ? "lg" : "md"} className={block ? "consult-sign-bar-btn" : "glow-border consult-sign-btn"}
      onClick={() => setSignOpen(true)} disabled={!ready} title={ready ? "Revisar y firmar" : missingText}>
      <Lock size={18} aria-hidden="true" /><span>Firmar nota</span>
    </Button>
  );
  const dxCard = <DiagnosesCard consultationId={consultation.id} readOnly={!editable} />;
  const amendments = consultation.status !== "draft" && (
    <section className="consult-amend-card" aria-labelledby="consult-amend-title">
      <h2 id="consult-amend-title" className="note-section-title">Enmiendas</h2>
      <p className="note-section-hint">El contenido firmado no cambia; las correcciones quedan como enmiendas.</p>
      <div className="consult-amend">
        {consultation.amendments.length === 0 ? <p className="consult-dx-empty">Sin enmiendas todavía. Si algo faltó, agrégalo aquí.</p> : (
          <ol className="consult-amend-list">
            {consultation.amendments.map((a) => (
              <li key={a.id}><p>{a.content}</p><span>{formatDateTime(a.created_at)}{a.reason ? ` · ${a.reason}` : ""}</span></li>
            ))}
          </ol>
        )}
        {canSign && (
          <div className="form-stack">
            <label>Nueva enmienda<AutoTextarea minRows={3} value={amend.content} onChange={(e) => setAmend((s) => ({ ...s, content: e.target.value }))} placeholder="Se agrega: …" /></label>
            <label>Motivo<input value={amend.reason} onChange={(e) => setAmend((s) => ({ ...s, reason: e.target.value }))} placeholder="Omisión, corrección…" /></label>
            <div className="form-actions">
              <Button variant="primary" onClick={() => addAmendment.mutate()} disabled={amend.content.trim().length < 3} isLoading={addAmendment.isPending}><FilePlus2 size={18} aria-hidden="true" /><span>Agregar enmienda</span></Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="data-screen consult-page">
      <PageHeader
        back={{ label: "Ficha del paciente", onClick: back }}
        eyebrow={<span className="consult-eyebrow"><Pill tone={status.tone}>{status.label}</Pill><span>{formatDateTime(consultation.consultation_date)}</span></span>}
        title={patient?.full_name ?? "Consulta"}
        description={editable ? <SaveIndicator state={state} savedAt={savedAt} /> : consultation.signed_at ? `Firmada el ${formatDateTime(consultation.signed_at)} · versión ${consultation.version}` : undefined}
      />

      <div className={clsx("consult-layout", reviewing && "is-reviewing", !stacked && (ctxCollapsed || !!aiDraft) && "ctx-collapsed")}>
        <PatientContext consultation={consultation} stacked={stacked} collapsed={ctxCollapsed || (!stacked && !!aiDraft)}
          onToggle={() => setCtxCollapsed((v) => !v)} />

        <div className="consult-main">
          {showStart && (
            <section className="consult-start" aria-labelledby="consult-start-title">
              <div className="consult-start-copy">
                <h2 id="consult-start-title" className="consult-start-title">{hasContent ? "Sigue con la nota" : "Empieza la nota"}</h2>
                {canAi ? (
                  <ol className="consult-flow" aria-label="Pasos">
                    <li>Graba o dicta</li><li>Revisa la transcripción</li><li>La IA ordena la nota</li><li>Tú firmas</li>
                  </ol>
                ) : <p className="consult-start-hint">Escribe directamente en cada sección. Se guarda solo.</p>}
              </div>
              {canAi && (
                <div className="consult-start-actions">
                  <Button variant={hasContent || consultation.transcript ? "gray" : "primary"} size="lg" className="consult-record-start" onClick={openRecord} disabled={!canRecord} title={sttReason ?? "Grabar la consulta y transcribirla"}>
                    <Mic size={18} aria-hidden="true" /><span>{consultation.transcript ? "Grabar de nuevo" : "Grabar consulta"}</span>
                  </Button>
                  {/* With a transcript, "Preparar nota con IA" lives on the transcript card (the next step). */}
                  {!consultation.transcript && (
                    <Button variant="tinted" size="lg" className="consult-ai-btn" onClick={() => setComposeOpen(true)}>
                      <Sparkles size={18} aria-hidden="true" /><span>✦ Preparar nota con IA</span>
                    </Button>
                  )}
                </div>
              )}
              {canAi && sttReason && <p className="consult-start-hint">{sttReason} Puedes pegar o dictar el texto en «Preparar nota con IA».</p>}
            </section>
          )}

          <div ref={setTranscriptEl} className="consult-transcript-slot" />

          {aiDraft && draft && (
            <div ref={reviewRef}>
              <AiReview draft={aiDraft} current={draft} existingCodes={existingCodes} applying={applyAi.isPending || rejectAi.isPending}
                onApply={(d) => applyAi.mutate(d)} onDiscardAll={() => rejectAi.mutate()} />
            </div>
          )}
          {draftNote.isPending && !aiDraft && (
            <section className="ai-card glow-border" data-tone="ai" aria-live="polite">
              <h2 className="ai-card-title">Preparando borrador…</h2>
              <div className="ai-shimmer"><span /><span /><span /></div>
            </section>
          )}

          <article className="consult-note" aria-labelledby="consult-note-title">
            <header className="consult-note-head">
              <h2 id="consult-note-title" className="consult-note-title">Nota de la consulta</h2>
              {!editable && <Pill tone="neutral">Solo lectura</Pill>}
            </header>
            {SOAP_FIELDS.map((f) => (
              <Fragment key={f}>
                <section className="note-section">
                  <div className="note-section-head">
                    <label htmlFor={`soap-${f}`} className="note-section-title">{SOAP_LABELS[f]}</label>
                    {editable && REQUIRED.includes(f) && (
                      draft?.[f]?.trim() ? <span className="note-req is-done"><Check size={14} aria-hidden="true" />Completo</span> : <span className="note-req">Necesario para firmar</span>
                    )}
                  </div>
                  {editable && draft ? (
                    <AutoTextarea id={`soap-${f}`} minRows={f === "chief_complaint" ? 1 : 2} value={draft[f]} placeholder={HINTS[f]}
                      onChange={(e) => setField(f, e.target.value)} onBlur={() => void flush()} />
                  ) : (
                    <p id={`soap-${f}`} className="consult-field-read">{consultation[f] || <em>Sin registrar</em>}</p>
                  )}
                </section>
                {f === "assessment" && stacked && <div className="consult-dx-inline">{dxCard}</div>}
              </Fragment>
            ))}

            {editable && canSign && (
              <footer className="consult-sign" aria-labelledby="consult-sign-title">
                <div className="consult-sign-copy">
                  <h2 id="consult-sign-title" className="note-section-title">Firmar la nota</h2>
                  <ul className="consult-sign-req">
                    {REQUIRED.map((f) => <li key={f} data-done={!!draft?.[f]?.trim()}>{draft?.[f]?.trim() ? <Check size={14} aria-hidden="true" /> : <span className="consult-sign-dot" aria-hidden="true" />}{SOAP_LABELS[f]}</li>)}
                    <li data-done={dx.length > 0}>{dx.length > 0 ? <Check size={14} aria-hidden="true" /> : <span className="consult-sign-dot" aria-hidden="true" />}Diagnóstico CIE-10</li>
                  </ul>
                  <p className="consult-sign-hint" data-ready={ready} role="status">{ready ? "Todo listo. Al firmar, la nota queda cerrada en la historia del paciente." : missingText}</p>
                </div>
                {signButton()}
              </footer>
            )}
          </article>

          {amendments}
        </div>

        {!stacked && <aside className="consult-side">{dxCard}</aside>}
      </div>

      {editable && canAi && (
        <ConsultationRecorder consultation={consultation} config={sttConfig} canRecord={canRecord}
          consentOpen={consentOpen} onConsentOpenChange={setConsentOpen}
          showRecordBar={!reviewing} hideTranscript={reviewing}
          transcriptTarget={transcriptEl}
          barAccessory={canSign ? signButton(true) : undefined}
          barHint={canSign ? <span data-ready={ready}>{missingText}</span> : undefined}
          preparing={draftNote.isPending} onPrepare={(text) => draftNote.mutate({ text, source: "transcript" })} onTranscribed={onTranscribed} />
      )}
      {editable && !canAi && canSign && !reviewing && (
        <div className="record-bar"><div className="record-bar-hint"><span data-ready={ready}>{missingText}</span></div><div className="record-bar-row">{signButton(true)}</div></div>
      )}

      <AiComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} pending={draftNote.isPending}
        initialText={consultation.transcript ?? ""} initialSource={consultation.transcript ? "transcript" : "free_text"}
        onRecord={canAi && editable ? openRecord : undefined} recordDisabledReason={sttReason}
        onSubmit={(text, source) => draftNote.mutate({ text, source })} />

      <Sheet open={signOpen} onClose={() => setSignOpen(false)} title="¿Firmar la nota?"
        subtitle="Al firmar, el contenido queda cerrado. Los cambios posteriores se registran como enmiendas."
        footer={<>
          <Button variant="gray" onClick={() => setSignOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => sign.mutate()} isLoading={sign.isPending}><Lock size={18} aria-hidden="true" /><span>Firmar</span></Button>
        </>}>
        <ul className="consult-sign-check">
          {SOAP_FIELDS.map((f) => (
            <li key={f} data-filled={!!draft?.[f]?.trim()}>{draft?.[f]?.trim() ? <Check size={16} aria-hidden="true" /> : <span className="consult-sign-dot" aria-hidden="true" />}{SOAP_LABELS[f]}</li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
