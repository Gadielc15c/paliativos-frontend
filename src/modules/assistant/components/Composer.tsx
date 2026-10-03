import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ArrowUp, Camera, FileText, Paperclip, Square, UserRound, X } from "lucide-react";
import { useMediaQuery } from "../../../components/common/useMediaQuery";
import { useAssistant } from "../store";

export const MAX_FILES = 5;
export const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf";
const OK_MIME = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

export interface PendingFile { id: string; file: File; url: string | null }

/** Validates and turns picked/pasted/dropped files into pending attachments (Spanish errors). */
export function useAttachments() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const add = useCallback((list: FileList | File[]) => {
    const incoming = [...list];
    const ok: PendingFile[] = [];
    for (const f of incoming) {
      const type = f.type || (/\.(heic|heif)$/i.test(f.name) ? "image/heic" : "");
      if (!OK_MIME.test(type)) { toast.error(`«${f.name}» no es un formato admitido. Usa JPG, PNG, HEIC, WEBP o PDF.`); continue; }
      if (f.size > MAX_BYTES) { toast.error(`«${f.name}» pesa más de 10 MB. Reduce la foto o divide el PDF.`); continue; }
      ok.push({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, file: f, url: type.startsWith("image/") && !/heic|heif/.test(type) ? URL.createObjectURL(f) : null });
    }
    const room = MAX_FILES - filesRef.current.length;
    if (ok.length > room) toast.error(`Puedes adjuntar hasta ${MAX_FILES} archivos por mensaje.`);
    if (room > 0 && ok.length) setFiles((cur) => [...cur, ...ok.slice(0, room)]);
  }, []);
  const remove = useCallback((id: string) => setFiles((cur) => cur.filter((f) => f.id !== id)), []);
  const clear = useCallback(() => setFiles([]), []);
  return { files, add, remove, clear };
}

export interface ComposerHandle { focus: () => void; pickFiles: () => void; setText: (t: string) => void }

interface ComposerProps {
  attachments: ReturnType<typeof useAttachments>;
  onSend: (text: string, files: File[]) => void;
}

const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer({ attachments, onSend }, ref) {
  const { streaming, stop, draft, draftVersion, context, clearContext } = useAssistant();
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const touch = useMediaQuery("(pointer: coarse)");

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    pickFiles: () => fileInput.current?.click(),
    setText: (t) => { setText(t); requestAnimationFrame(() => area.current?.focus()); },
  }));

  // Prefill from openAssistant({ prompt }).
  useEffect(() => {
    if (!draftVersion) return;
    setText(draft);
    requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(draft.length, draft.length); });
  }, [draftVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-grow up to ~8 lines.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const canSend = !streaming && (text.trim().length > 0 || attachments.files.length > 0);
  const submit = () => {
    if (!canSend) return;
    onSend(text, attachments.files.map((f) => f.file));
    setText("");
    attachments.clear();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
  };
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (imgs.length) { e.preventDefault(); attachments.add(imgs); }
  };

  return (
    <div className="as-composer-wrap">
      {context.patientId && (
        <div className="as-context">
          <span className="as-context-pill" title={context.patientName ?? undefined}>
            <UserRound size={14} aria-hidden="true" />
            <span className="as-context-name">Sobre: {context.patientName || "paciente seleccionado"}</span>
            <button type="button" className="as-context-remove" onClick={clearContext} aria-label="Quitar el contexto del paciente"><X size={14} aria-hidden="true" /></button>
          </span>
        </div>
      )}
      <form className="as-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {attachments.files.length > 0 && (
          <ul className="as-pending" aria-label="Archivos para enviar">
            {attachments.files.map((f) => (
              <li key={f.id} className="as-pending-item" title={f.file.name}>
                {f.url ? <img src={f.url} alt="" /> : <span className="as-pending-file"><FileText size={18} aria-hidden="true" /><span>{f.file.name}</span></span>}
                <button type="button" className="as-pending-remove" onClick={() => attachments.remove(f.id)} aria-label={`Quitar ${f.file.name}`}><X size={14} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
        <label className="sr-only" htmlFor="as-input">Mensaje para el asistente</label>
        <textarea id="as-input" ref={area} className="as-textarea-input" rows={1} value={text} placeholder={context.patientName ? `Pregunta sobre ${context.patientName}…` : "Pregunta o sube una foto…"}
          onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste} enterKeyHint="send" aria-describedby="as-hint" />
        <div className="as-composer-bar">
          <div className="as-composer-tools">
            <button type="button" className="as-icon-button" onClick={() => fileInput.current?.click()} aria-label="Adjuntar fotos o PDF" title="Adjuntar fotos o PDF (máx. 5, 10 MB c/u)">
              <Paperclip size={20} aria-hidden="true" />
            </button>
            {touch && (
              <button type="button" className="as-icon-button" onClick={() => cameraInput.current?.click()} aria-label="Tomar una foto">
                <Camera size={20} aria-hidden="true" />
              </button>
            )}
            <span id="as-hint" className="as-hint">{touch ? "" : "Enter envía · Mayús+Enter, nueva línea"}</span>
          </div>
          {streaming ? (
            <button type="button" className="as-send is-stop" onClick={stop} aria-label="Detener la respuesta"><Square size={14} aria-hidden="true" fill="currentColor" /></button>
          ) : (
            <button type="submit" className="as-send" disabled={!canSend} aria-label="Enviar"><ArrowUp size={20} aria-hidden="true" /></button>
          )}
        </div>
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { if (e.target.files) attachments.add(e.target.files); e.target.value = ""; }} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { if (e.target.files) attachments.add(e.target.files); e.target.value = ""; }} />
      </form>
    </div>
  );
});

export default Composer;
