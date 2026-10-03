import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import clsx from "clsx";
import { History as HistoryIcon, Maximize2, Minimize2, SquarePen, Upload, X } from "lucide-react";
import { useAppStore } from "../../../app/store/useAppStore";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { useAssistant } from "../store";
import Composer, { useAttachments, type ComposerHandle } from "./Composer";
import Message from "./Message";
import History from "./History";
import { SurfaceContext } from "./Blocks";
import type { ChatMessage } from "../../../types/agent";
import "../assistant.css";

const plain = (m?: ChatMessage) => (m ? m.parts.map((p) => (p.kind === "text" ? p.text : "")).join("").replace(/[*_`#|]/g, "") : "");

/** Screen-reader narration of the streamed reply: whole sentences, at most every 1.5 s. */
function useStreamAnnouncer() {
  const [text, setText] = useState("");
  const said = useRef(0);
  const streaming = useAssistant((s) => s.streaming);
  useEffect(() => {
    const last = () => [...useAssistant.getState().messages].reverse().find((m) => m.role === "assistant");
    if (streaming) {
      said.current = 0;
      setText("El asistente está respondiendo…");
      const t = window.setInterval(() => {
        const full = plain(last());
        const rest = full.slice(said.current);
        const end = Math.max(rest.lastIndexOf(". "), rest.lastIndexOf("\n"), rest.lastIndexOf("? "), rest.lastIndexOf("! "));
        if (end > 0) { setText(rest.slice(0, end + 1).trim()); said.current += end + 1; }
      }, 1500);
      return () => window.clearInterval(t);
    }
    const m = last();
    if (!m) return;
    const rest = plain(m).slice(said.current).trim();
    const extras = m.parts.filter((p) => p.kind === "proposal").length;
    setText([rest, m.error, extras ? `${extras} ${extras === 1 ? "propuesta espera" : "propuestas esperan"} tu confirmación.` : ""].filter(Boolean).join(" "));
  }, [streaming]);
  return text;
}

function Suggestions({ onPick, onUpload }: { onPick: (t: string) => void; onUpload: () => void }) {
  const role = useAppStore((s) => s.user?.role);
  const patientName = useAssistant((s) => s.context.patientName);
  const fallbackPatient = import.meta.env.DEV && new URLSearchParams(location.search).get("mock") === "1" ? "Elena Rodríguez" : null;
  const clinical = role !== "secretary";
  const items: Array<{ label: string; run: () => void }> = clinical ? [
    { label: "Sube la foto de un resultado de laboratorio", run: onUpload },
    { label: "¿Qué pacientes no tienen seguimiento?", run: () => onPick("¿Qué pacientes no tienen seguimiento?") },
    { label: `Resume a ${patientName || fallbackPatient || "mi último paciente"}`, run: () => onPick(`Resume a ${patientName || fallbackPatient || "mi último paciente"}`) },
    { label: "¿Qué diagnósticos aumentaron este mes?", run: () => onPick("¿Qué diagnósticos aumentaron este mes?") },
  ] : [
    { label: "Sube la foto de una cédula para crear un paciente", run: onUpload },
    { label: "¿Qué facturas están pendientes de cobro?", run: () => onPick("¿Qué facturas están pendientes de cobro?") },
    { label: "¿Qué pacientes no tienen seguimiento?", run: () => onPick("¿Qué pacientes no tienen seguimiento?") },
    { label: "¿Quién tiene control esta semana?", run: () => onPick("¿Quién tiene seguimiento esta semana?") },
  ];
  return (
    <div className="as-empty">
      <span className="as-empty-mark" aria-hidden="true">✦</span>
      <h3 className="as-empty-title">¿En qué te ayudo?</h3>
      <p className="as-empty-copy">
        {clinical
          ? "Busco pacientes, resumo historias, leo fotos de resultados y preparo cambios. Nada se guarda sin tu confirmación."
          : "Busco pacientes, seguimientos y facturas, y leo fotos de documentos. Nada se guarda sin tu confirmación."}
      </p>
      <ul className="as-suggestions">
        {items.map((s) => <li key={s.label}><button type="button" className="as-suggestion" onClick={s.run}>{s.label}</button></li>)}
      </ul>
    </div>
  );
}

interface AssistantChatProps {
  surface: "panel" | "page";
  /** Desktop page: history lives in its own column. */
  historyColumn?: boolean;
  onClose?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
  autoFocus?: boolean;
}

export default function AssistantChat({ surface, historyColumn, onClose, onExpand, onCollapse, autoFocus }: AssistantChatProps) {
  const { messages, send, newChat, loadingConversation } = useAssistant();
  const compact = useIsCompact();
  const titleId = useId();
  const [view, setView] = useState<"chat" | "history">("chat");
  const [dragging, setDragging] = useState(false);
  const attachments = useAttachments();
  const composer = useRef<ComposerHandle | null>(null);
  const log = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);
  const announce = useStreamAnnouncer();

  useEffect(() => { if (autoFocus) requestAnimationFrame(() => composer.current?.focus()); }, [autoFocus]);

  // Follow the stream only while the reader is at the bottom.
  useEffect(() => {
    const el = log.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const onScroll = () => {
    const el = log.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const doSend = (text: string, files: File[]) => { stick.current = true; setView("chat"); void send(text, files); };

  const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes("Files");
  const dnd = compact ? {} : {
    onDragEnter: (e: DragEvent) => { if (hasFiles(e)) { e.preventDefault(); setDragging(true); } },
    onDragOver: (e: DragEvent) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); },
    onDrop: (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); setDragging(false); setView("chat"); attachments.add(e.dataTransfer.files); composer.current?.focus(); },
  };

  return (
    <SurfaceContext.Provider value={surface}>
      <div className={clsx("as-chat", `is-${surface}`)} aria-labelledby={titleId} {...dnd}>
        <header className="as-head">
          <div className="as-head-title">
            <span className="as-head-mark" aria-hidden="true">✦</span>
            <h2 id={titleId}>Asistente</h2>
          </div>
          <div className="as-head-actions">
            {!historyColumn && (
              <button type="button" className="as-icon-button" aria-pressed={view === "history"} onClick={() => setView((v) => (v === "history" ? "chat" : "history"))}
                aria-label={view === "history" ? "Volver a la conversación" : "Historial de conversaciones"} title="Historial">
                <HistoryIcon size={20} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="as-icon-button" onClick={() => { newChat(); setView("chat"); composer.current?.focus(); }} aria-label="Nueva conversación" title="Nueva conversación">
              <SquarePen size={20} aria-hidden="true" />
            </button>
            {onExpand && !compact && (
              <button type="button" className="as-icon-button" onClick={onExpand} aria-label="Abrir a pantalla completa" title="Pantalla completa">
                <Maximize2 size={18} aria-hidden="true" />
              </button>
            )}
            {onCollapse && !compact && (
              <button type="button" className="as-icon-button" onClick={onCollapse} aria-label="Volver al panel lateral" title="Panel lateral">
                <Minimize2 size={18} aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button type="button" className="as-icon-button" onClick={onClose} aria-label="Cerrar el asistente" title="Cerrar (Esc)">
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {view === "history" && !historyColumn ? (
          <div className="as-history-view"><History onPicked={() => setView("chat")} /></div>
        ) : (
          <>
            <div ref={log} className="as-log" role="log" aria-label="Conversación con el asistente" aria-busy={loadingConversation || undefined} onScroll={onScroll} tabIndex={-1}>
              <div className="as-log-inner">
                {loadingConversation ? (
                  <div className="as-loading">{[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: i === 1 ? 120 : 48 }} />)}</div>
                ) : messages.length === 0 ? (
                  <Suggestions onPick={(t) => doSend(t, [])} onUpload={() => { composer.current?.setText("Lee este documento y guárdalo en la ficha del paciente."); composer.current?.pickFiles(); }} />
                ) : (
                  messages.map((m, i) => <Message key={m.id} m={m} isLast={i === messages.length - 1} />)
                )}
              </div>
            </div>
            <div className="sr-only" aria-live="polite" aria-atomic="true">{announce}</div>
            <div className="as-foot">
              <Composer ref={composer} attachments={attachments} onSend={doSend} />
              <p className="as-disclaimer">El asistente puede equivocarse. Revisa los datos antes de confirmar.</p>
            </div>
          </>
        )}
        {dragging && (
          <div className="as-drop" aria-hidden="true"><Upload size={28} /><span>Suelta para adjuntar (fotos o PDF)</span></div>
        )}
      </div>
    </SurfaceContext.Provider>
  );
}
