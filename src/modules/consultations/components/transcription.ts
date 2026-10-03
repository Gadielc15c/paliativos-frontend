import { aiEndpoints } from "../../../services/endpoints";
import type { AiTranscription } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";
import { RecorderError, type AudioSegment, type RecorderErrorKind } from "./useAudioRecorder";

export interface UploadProgress {
  /** 0..1 over all bytes of all segments. */
  ratio: number;
  /** True while the server transcribes a chunk whose bytes are already sent. */
  processing: boolean;
  chunk: number;
  chunks: number;
}

const RETRYABLE = new Set(["CONNECTION_ERROR", "TRANSCRIPTION_FAILED", "502", "504", "500"]);
const isRetryable = (e: unknown) => RETRYABLE.has(String((e as ApiError)?.code ?? ""));

/**
 * Uploads segments in order (chunk_index 0..n-1, `final` on the last one). Each chunk is retried
 * once on network / provider errors; the backend treats a repeated chunk_index as idempotent.
 */
export async function uploadSegments(
  consultationId: string,
  segments: AudioSegment[],
  onProgress: (p: UploadProgress) => void,
): Promise<AiTranscription> {
  const total = segments.reduce((n, s) => n + s.blob.size, 0) || 1;
  let sent = 0;
  let sessionId: string | undefined;
  let last: AiTranscription | null = null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const report = (loaded: number) => onProgress({ ratio: Math.min(1, (sent + loaded) / total), processing: loaded >= seg.blob.size, chunk: i + 1, chunks: segments.length });
    report(0);
    for (let attempt = 0; ; attempt++) {
      try {
        last = await aiEndpoints.transcribe(consultationId, {
          file: seg.blob,
          filename: `consulta-${i}.${seg.ext}`,
          chunkIndex: i,
          final: i === segments.length - 1,
          sessionId,
          durationSeconds: seg.durationSec,
        }, report);
        break;
      } catch (e) {
        if (attempt === 0 && isRetryable(e)) continue;
        throw e;
      }
    }
    sessionId = last.session_id;
    sent += seg.blob.size;
  }
  onProgress({ ratio: 1, processing: false, chunk: segments.length, chunks: segments.length });
  return last!;
}

const RECORDER_MESSAGES: Record<RecorderErrorKind, [string, string]> = {
  unsupported: ["Este navegador no puede grabar audio", "Usa una versión reciente de Chrome, Edge, Firefox o Safari."],
  insecure: ["La grabación necesita una conexión segura", "Abre la aplicación con https:// para usar el micrófono."],
  denied: ["No hay permiso para usar el micrófono", "Permite el micrófono en la barra de direcciones del navegador y vuelve a intentarlo."],
  "no-mic": ["No se encontró ningún micrófono", "Conecta un micrófono o revisa la configuración de audio del equipo."],
  busy: ["El micrófono está ocupado", "Otra aplicación lo está usando. Ciérrala y vuelve a intentarlo."],
  failed: ["No se pudo iniciar la grabación", "Vuelve a intentarlo. Si persiste, recarga la página."],
};

const API_MESSAGES: Record<string, [string, string?]> = {
  CONNECTION_ERROR: ["Sin conexión con el servidor", "La grabación se conserva en esta pantalla. Revisa la conexión y reintenta el envío."],
  TRANSCRIPTION_FAILED: ["El servicio de transcripción falló", "La grabación se conserva. Reintenta el envío en unos segundos."],
  TRANSCRIPTION_UNAVAILABLE: ["La transcripción no está disponible", "Este servidor no tiene configurado un servicio de transcripción."],
  AI_DISABLED: ["El asistente de IA está desactivado en este servidor"],
  AUDIO_TOO_LARGE: ["El audio es demasiado grande", "Graba consultas más cortas o pide al administrador que active la división en el servidor."],
  UNSUPPORTED_AUDIO: ["Formato de audio no admitido", "Prueba con otro navegador."],
  CONSENT_REQUIRED: ["Falta el consentimiento del paciente", "Confirma la autorización antes de grabar."],
  CHUNK_SEQUENCE: ["Se perdió una parte de la grabación", "Reintenta el envío."],
  CONFLICT: ["La nota ya está firmada", "Solo se puede transcribir en borradores."],
  FORBIDDEN: ["No tienes permiso para transcribir consultas"],
  "403": ["No tienes permiso para transcribir consultas"],
};

/** Spanish title + description for a recorder or API error. */
export function transcriptionErrorMessage(e: unknown): { title: string; description?: string; retryable: boolean } {
  if (e instanceof RecorderError) {
    const [title, description] = RECORDER_MESSAGES[e.kind];
    return { title, description, retryable: false };
  }
  const code = String((e as ApiError)?.code ?? "");
  const known = API_MESSAGES[code];
  const retryable = isRetryable(e) || code === "CHUNK_SEQUENCE";
  if (known) return { title: known[0], description: known[1], retryable };
  return { title: "No se pudo transcribir la grabación", description: (e as ApiError)?.message || undefined, retryable: true };
}

export function formatTimer(sec: number) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(sec: number) {
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function formatCost(usd: number) {
  if (usd > 0 && usd < 0.001) return "< US$0.001";
  return `≈ US$${usd.toFixed(3)}`;
}
