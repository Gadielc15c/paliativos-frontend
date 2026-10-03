import { httpClient } from "../http";
import { epiParams } from "./epi";
import type {
  AiAcceptBody, AiDraftNote, AiEpiAnswer, AiEpiInsights, AiPatientSummary, AiSuggestionRead, AiTranscription,
  AiTranscriptionConfig, EpiFilters,
} from "../../types/clinical";

export interface TranscribeChunk {
  file: Blob;
  filename: string;
  chunkIndex: number;
  final: boolean;
  /** From the first chunk's response; required for chunk_index > 0. */
  sessionId?: string;
  durationSeconds?: number;
  /** Chain draft-note on the final chunk. */
  draft?: boolean;
}

export const aiEndpoints = {
  /** One audio chunk (multipart). `consent` is always sent: the UI only records after the consent dialog. */
  transcribe: async (consultationId: string, chunk: TranscribeChunk, onProgress?: (loaded: number) => void) => {
    const form = new FormData();
    form.append("file", chunk.file, chunk.filename);
    form.append("consent", "true");
    form.append("chunk_index", String(chunk.chunkIndex));
    form.append("final", String(chunk.final));
    if (chunk.sessionId) form.append("session_id", chunk.sessionId);
    if (chunk.durationSeconds !== undefined) form.append("duration_seconds", chunk.durationSeconds.toFixed(2));
    if (chunk.draft) form.append("draft", "true");
    return (await httpClient.post<AiTranscription>(`/ai/consultations/${consultationId}/transcribe`, form, {
      timeout: 300000,
      onUploadProgress: (e) => onProgress?.(e.loaded),
    })).data;
  },
  transcriptionConfig: async () => (await httpClient.get<AiTranscriptionConfig>("/ai/transcription/config")).data,
  draftNote: async (consultationId: string, text: string, source: "free_text" | "transcript" = "free_text") =>
    (await httpClient.post<AiDraftNote>(`/ai/consultations/${consultationId}/draft-note`, { text, source }, { timeout: 60000 })).data,
  accept: async (suggestionId: string, body: AiAcceptBody = {}) =>
    (await httpClient.post<AiSuggestionRead>(`/ai/suggestions/${suggestionId}/accept`, body)).data,
  reject: async (suggestionId: string, reason?: string) =>
    (await httpClient.post<AiSuggestionRead>(`/ai/suggestions/${suggestionId}/reject`, reason ? { reason } : {})).data,
  patientSummary: async (patientId: string) =>
    (await httpClient.get<AiPatientSummary>(`/ai/patients/${patientId}/summary`, { timeout: 60000 })).data,
  ask: async (question: string) =>
    (await httpClient.post<AiEpiAnswer>("/ai/epi/ask", { question }, { timeout: 60000 })).data,
  insights: async (filters: EpiFilters) =>
    (await httpClient.get<AiEpiInsights>("/ai/epi/insights", { params: epiParams(filters), timeout: 60000 })).data,
};
