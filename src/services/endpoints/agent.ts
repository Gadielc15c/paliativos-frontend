import { httpClient } from "../http";
import { getAccessToken } from "../auth";
import type { AgentConversation, AgentConversationSummary, AgentEvent, ConfirmResult } from "../../types/agent";

export interface StreamChatInput {
  message: string;
  conversationId?: string | null;
  patientId?: string | null;
  files?: File[];
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}

/** Error with the backend code so the UI can say something specific in Spanish. */
export class AgentError extends Error {
  constructor(public code: string, message: string, public status?: number) { super(message); }
}

type StreamImpl = (input: StreamChatInput) => Promise<void>;
let streamOverride: StreamImpl | null = null;
/** DEV mock hook (src/dev/mockAgent.ts). Never set in production. */
export const setAgentStreamImpl = (impl: StreamImpl | null) => { streamOverride = impl; };

/** Parses `text/event-stream` frames (`data: {...}\n\n`) from a fetch body. */
async function readSse(body: ReadableStream<Uint8Array>, onEvent: (e: AgentEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (frame: string) => {
    const data = frame.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).replace(/^ /, "")).join("\n");
    if (!data || data === "[DONE]") return;
    try { onEvent(JSON.parse(data) as AgentEvent); } catch { /* ignore malformed frame */ }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, "");
      flush(frame);
    }
  }
  if (buffer.trim()) flush(buffer);
}

async function fetchStream({ message, conversationId, patientId, files = [], signal, onEvent }: StreamChatInput) {
  const form = new FormData();
  form.append("message", message);
  if (conversationId) form.append("conversation_id", conversationId);
  if (patientId) form.append("patient_id", patientId);
  for (const f of files) form.append("files[]", f, f.name); // backend accepts files[] and files
  const token = getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${httpClient.defaults.baseURL}/agent/chat`, {
      method: "POST", body: form, signal,
      headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AgentError("CONNECTION_ERROR", "No se pudo conectar con el servidor.");
  }
  if (!res.ok || !res.body) {
    let code = String(res.status);
    let msg = "";
    try {
      const j = await res.json();
      code = j?.error?.code ?? j?.code ?? code;
      msg = j?.error?.message ?? j?.detail ?? "";
    } catch { /* not json */ }
    throw new AgentError(code, typeof msg === "string" ? msg : "", res.status);
  }
  await readSse(res.body, onEvent);
}

export const agentEndpoints = {
  streamChat: (input: StreamChatInput) => (streamOverride ?? fetchStream)(input),
  conversations: async (limit = 20) => (await httpClient.get<AgentConversationSummary[]>("/agent/conversations", { params: { limit } })).data,
  conversation: async (id: string) => (await httpClient.get<AgentConversation>(`/agent/conversations/${id}`)).data,
  deleteConversation: async (id: string) => { await httpClient.delete(`/agent/conversations/${id}`); },
  confirm: async (id: string, edits?: Record<string, unknown>) =>
    (await httpClient.post<ConfirmResult>(`/agent/proposals/${id}/confirm`, edits ? { edits } : {})).data,
  reject: async (id: string, reason = "Descartado por el usuario") =>
    (await httpClient.post<{ status: "rejected" }>(`/agent/proposals/${id}/reject`, { reason })).data,
  /** Attachment previews need the bearer token, so they are fetched as blobs. */
  attachmentBlob: async (url: string) => {
    const base = String(httpClient.defaults.baseURL ?? "");
    let path = url.startsWith(base) ? url.slice(base.length) : url;
    path = path.replace(/^\/api\/v1(?=\/)/, "");
    return (await httpClient.get<Blob>(path, { responseType: "blob" })).data;
  },
};
