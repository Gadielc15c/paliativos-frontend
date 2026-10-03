import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mic, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Square, Trash2, X } from "lucide-react";
import Sheet from "../../../components/common/Sheet";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import type { AiTranscription, AiTranscriptionConfig, ConsultationRead } from "../../../types/clinical";
import { recorderSupport, RecorderError, useAudioRecorder, type AudioSegment } from "./useAudioRecorder";
import { formatCost, formatDuration, formatTimer, transcriptionErrorMessage, uploadSegments, type UploadProgress } from "./transcription";

/** Shows a toast and returns false when this browser cannot record. Call before opening the consent dialog. */
export function ensureRecordable(): boolean {
  const problem = recorderSupport();
  if (!problem) return true;
  const m = transcriptionErrorMessage(new RecorderError(problem));
  toast.error(m.title, { description: m.description });
  return false;
}

interface Meta { duration: number; cost: number; model: string }

interface Props {
  consultation: ConsultationRead;
  config?: AiTranscriptionConfig;
  /** Draft + clinical:write + ai:use + server has an STT provider. */
  canRecord: boolean;
  consentOpen: boolean;
  onConsentOpenChange: (open: boolean) => void;
  /** Phones: show the big record button in the sticky bottom bar. */
  showRecordBar: boolean;
  /** Hide the transcript card (e.g. while the AI draft is being reviewed). */
  hideTranscript: boolean;
  preparing: boolean;
  onPrepare: (transcript: string) => void;
  onTranscribed: (result: AiTranscription) => void;
  /** Where the transcript card renders (portal into the note, right before the sections). Inline when null. */
  transcriptTarget?: HTMLElement | null;
  /** Phones: extra control in the sticky bottom bar next to "Grabar" (e.g. "Firmar nota"). */
  barAccessory?: ReactNode;
  /** Phones: one line above the bottom bar buttons (e.g. what is missing to sign). */
  barHint?: ReactNode;
}

type Busy = { kind: "upload"; progress: UploadProgress } | null;

export default function ConsultationRecorder({
  consultation, config, canRecord, consentOpen, onConsentOpenChange, showRecordBar, hideTranscript, preparing, onPrepare, onTranscribed,
  transcriptTarget, barAccessory, barHint,
}: Props) {
  const [params] = useSearchParams();
  const preview = import.meta.env.DEV ? params.get("rec") : null;
  const meterRef = useRef<HTMLSpanElement>(null);
  const onLevel = useCallback((level: number) => { meterRef.current?.style.setProperty("--level", level.toFixed(3)); }, []);
  const rec = useAudioRecorder({ onLevel });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [failed, setFailed] = useState<AudioSegment[] | null>(null);
  const [text, setText] = useState(consultation.transcript ?? "");
  const [meta, setMeta] = useState<Meta | null>(consultation.transcript_info
    ? { duration: consultation.transcript_info.duration_seconds, cost: consultation.transcript_info.cost_estimate_usd, model: consultation.transcript_info.model }
    : null);

  // A transcript loaded later (refetch) fills the card if the doctor has not typed anything.
  useEffect(() => {
    if (consultation.transcript && !text) setText(consultation.transcript);
    const info = consultation.transcript_info;
    if (info && !meta) setMeta({ duration: info.duration_seconds, cost: info.cost_estimate_usd, model: info.model });
  }, [consultation.transcript, consultation.transcript_info]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = rec.phase !== "idle" || !!busy;
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  const upload = useCallback(async (segments: AudioSegment[]) => {
    setFailed(null);
    setBusy({ kind: "upload", progress: { ratio: 0, processing: false, chunk: 1, chunks: segments.length } });
    try {
      const result = await uploadSegments(consultation.id, segments, (progress) => setBusy({ kind: "upload", progress }));
      setText(result.transcript ?? "");
      setMeta({ duration: result.duration_seconds, cost: result.cost_estimate_usd, model: result.model });
      onTranscribed(result);
      toast.success("Transcripción lista", { description: "Revísala y corrígela antes de preparar la nota." });
    } catch (e) {
      const m = transcriptionErrorMessage(e);
      if (m.retryable) setFailed(segments);
      toast.error(m.title, { description: m.description, ...(m.retryable ? { action: { label: "Reintentar", onClick: () => void upload(segments) } } : {}) });
    } finally {
      setBusy(null);
    }
  }, [consultation.id, onTranscribed]);

  // DEV: ?rec=transcript runs one fake chunk through the mock transcribe endpoint.
  const previewed = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || previewed.current || preview !== "transcript") return;
    previewed.current = true;
    void upload([{ blob: new Blob(["preview"], { type: "audio/webm" }), durationSec: 252, ext: "webm" }]);
  }, [preview, upload]);
  useEffect(() => { if (import.meta.env.DEV && preview === "consent") onConsentOpenChange(true); }, [preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = async () => {
    onConsentOpenChange(false);
    setConsent(false);
    try {
      await rec.start();
    } catch (e) {
      const m = transcriptionErrorMessage(e);
      toast.error(m.title, { description: m.description });
    }
  };

  const finish = async () => {
    const segments = await rec.stop();
    if (!segments.length) { toast.error("La grabación está vacía", { description: "No se capturó audio. Revisa el micrófono y vuelve a intentarlo." }); return; }
    await upload(segments);
  };

  const discard = () => {
    rec.cancel();
    toast("Grabación descartada", { description: "No se envió ningún audio." });
  };

  const requestRecord = () => { if (ensureRecordable()) onConsentOpenChange(true); };

  // Deterministic DEV previews (?rec=recording|paused|uploading) — no microphone needed.
  const shownPhase = preview === "recording" || preview === "paused" ? preview : rec.phase;
  const shownElapsed = preview === "recording" || preview === "paused" ? 252 : rec.elapsed;
  const shownBusy: Busy = preview === "uploading" ? { kind: "upload", progress: { ratio: .42, processing: false, chunk: 1, chunks: 2 } } : busy;
  const recording = shownPhase === "recording" || shownPhase === "paused" || shownPhase === "stopping" || shownPhase === "starting";

  useEffect(() => { if (preview === "recording") meterRef.current?.style.setProperty("--level", ".55"); }, [preview]);

  const pricePerMin = config?.price_per_min ?? 0.003;
  const showCard = !hideTranscript && !recording && !shownBusy && (text.trim().length > 0 || !!failed);

  const card = showCard ? (
        <section className="data-card transcript-card" aria-labelledby="transcript-title">
          <div className="data-card-header">
            <div>
              <h2 id="transcript-title" className="data-card-title">Transcripción de la consulta</h2>
              {meta && (
                <p className="data-card-subtitle transcript-meta">
                  <span>{formatDuration(meta.duration)}</span><span aria-hidden="true">·</span><span>{formatCost(meta.cost)}</span>
                </p>
              )}
            </div>
            <Pill tone="neutral">Editable</Pill>
          </div>
          <div className="data-card-body transcript-body">
            {failed ? (
              <div className="transcript-failed" role="alert">
                <p>La grabación no se pudo transcribir. El audio sigue en esta pantalla hasta que lo envíes o lo descartes.</p>
                <div className="transcript-actions">
                  <Button variant="gray" onClick={() => setFailed(null)}><Trash2 size={18} aria-hidden="true" /><span>Descartar audio</span></Button>
                  <Button variant="primary" onClick={() => void upload(failed)}><RotateCcw size={18} aria-hidden="true" /><span>Reintentar envío</span></Button>
                </div>
              </div>
            ) : (
              <>
                <textarea className="transcript-text" aria-label="Texto transcrito" rows={7} value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} />
                <div className="transcript-actions">
                  <p className="transcript-note"><ShieldCheck size={16} aria-hidden="true" />El audio no se guarda. Antes de ir a la IA, los datos personales se sustituyen por marcadores.</p>
                  <Button variant="tinted" className="consult-ai-btn" disabled={text.trim().length < 3} isLoading={preparing} onClick={() => onPrepare(text.trim())}>
                    <Sparkles size={18} aria-hidden="true" /><span>✦ Preparar nota con IA</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
  ) : null;

  return (
    <>
      {transcriptTarget ? (card && createPortal(card, transcriptTarget)) : card}

      {(recording || shownBusy) && (
        <div className="recorder-dock">
          <div className={recording && shownPhase !== "paused" ? "recorder-pill glow-border" : "recorder-pill"} data-tone={recording && shownPhase !== "paused" ? "ai" : undefined}
            data-phase={shownBusy ? "uploading" : shownPhase} role="region" aria-label="Grabación de la consulta">
            {shownBusy ? (
              <>
                <span className="recorder-status">
                  <span className="recorder-title">{shownBusy.progress.processing ? "Transcribiendo…" : "Enviando audio…"}</span>
                  <span className="recorder-sub">
                    {shownBusy.progress.chunks > 1 ? `Parte ${shownBusy.progress.chunk} de ${shownBusy.progress.chunks} · ` : ""}{Math.round(shownBusy.progress.ratio * 100)} %
                  </span>
                </span>
                <span className="recorder-progress" role="progressbar" aria-label="Progreso del envío" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shownBusy.progress.ratio * 100)}>
                  <span style={{ transform: `scaleX(${shownBusy.progress.ratio})` }} />
                </span>
              </>
            ) : (
              <>
                <span className="recorder-dot" aria-hidden="true" />
                <span className="recorder-status">
                  <span className="recorder-time" role="timer" aria-live="off">{formatTimer(shownElapsed)}</span>
                  <span className="recorder-sub">{shownPhase === "paused" ? "En pausa" : shownPhase === "starting" ? "Abriendo micrófono…" : shownPhase === "stopping" ? "Cerrando…" : `${formatCost((shownElapsed / 60) * pricePerMin)}`}</span>
                </span>
                <span ref={meterRef} className="recorder-meter" aria-hidden="true"><span /><span /><span /><span /><span /></span>
                <span className="recorder-controls">
                  <Button variant="plain" className="recorder-icon recorder-discard" aria-label="Descartar grabación" title="Descartar grabación" onClick={discard} disabled={shownPhase === "stopping"}><X size={20} aria-hidden="true" /></Button>
                  {shownPhase === "paused" ? (
                    <Button variant="gray" className="recorder-icon recorder-toggle" aria-label="Reanudar" title="Reanudar" onClick={rec.resume}><Play size={20} aria-hidden="true" /></Button>
                  ) : (
                    <Button variant="gray" className="recorder-icon recorder-toggle" aria-label="Pausar" title="Pausar" onClick={rec.pause} disabled={shownPhase !== "recording"}><Pause size={20} aria-hidden="true" /></Button>
                  )}
                  <Button variant="primary" className="recorder-stop" onClick={() => void finish()} disabled={shownPhase === "stopping" || shownPhase === "starting"}>
                    <Square size={16} aria-hidden="true" fill="currentColor" /><span>Transcribir</span>
                  </Button>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {showRecordBar && (canRecord || !!barAccessory) && !recording && !shownBusy && (
        <div className="record-bar">
          {barHint && <div className="record-bar-hint">{barHint}</div>}
          <div className="record-bar-row">
            {canRecord && (
              <Button variant="gray" size="lg" className="record-bar-btn" onClick={requestRecord}>
                <span className="record-bar-dot" aria-hidden="true" /><span>{barAccessory ? (text.trim() ? "Regrabar" : "Grabar") : text.trim() ? "Grabar de nuevo" : "Grabar consulta"}</span>
              </Button>
            )}
            {barAccessory}
          </div>
        </div>
      )}

      <Sheet open={consentOpen} onClose={() => { onConsentOpenChange(false); setConsent(false); }} title="Grabar la consulta"
        subtitle="El audio se transcribe para preparar la nota. Necesitas la autorización del paciente."
        footer={<>
          <Button variant="gray" onClick={() => { onConsentOpenChange(false); setConsent(false); }}>Cancelar</Button>
          <Button variant="primary" disabled={!consent} onClick={() => void begin()}><Mic size={18} aria-hidden="true" /><span>Empezar a grabar</span></Button>
        </>}>
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>El paciente autoriza grabar la consulta</span>
        </label>
        <ul className="consent-facts">
          <li>El audio solo se usa para transcribir y no se guarda.</li>
          <li>La transcripción queda en esta consulta y puedes corregirla.</li>
          <li>Coste estimado: US${pricePerMin.toFixed(3)} por minuto{config?.model ? ` (${config.model})` : ""}.</li>
        </ul>
      </Sheet>
    </>
  );
}
