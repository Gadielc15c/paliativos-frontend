import { create } from "zustand";
import { toast } from "sonner";
import { agentEndpoints, AgentError } from "../../services/endpoints/agent";
import type { AgentAttachment, AgentConversation, AgentEvent, AgentProposal, ChatMessage, ChatPart } from "../../types/agent";

export interface AssistantContext { patientId?: string | null; patientName?: string | null }
export interface OpenAssistantOptions { patientId?: string | null; patientName?: string | null; prompt?: string }

interface AssistantState {
  open: boolean;
  context: AssistantContext;
  /** Text to prefill in the composer (from openAssistant({ prompt })). */
  draft: string;
  draftVersion: number;
  conversationId: string | null;
  messages: ChatMessage[];
  streaming: boolean;
  loadingConversation: boolean;
  /** Bumped whenever the server-side list may have changed. */
  historyVersion: number;
  /** Desktop side panel width (px), remembered per viewer. */
  panelWidth: number;
  setPanelWidth: (w: number, persist?: boolean) => void;
  openAssistant: (opts?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  clearContext: () => void;
  send: (text: string, files?: File[]) => Promise<void>;
  stop: () => void;
  retry: () => void;
  newChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  forgetConversation: (id: string) => void;
  updateProposal: (messageId: string, proposalId: string, patch: Partial<AgentProposal>) => void;
}

let controller: AbortController | null = null;
const WIDTH_KEY = "assistant_panel_width";
export const PANEL_MIN = 360;
export const PANEL_MAX = 720;
export const PANEL_DEFAULT = 420;
const readWidth = () => {
  try { const v = Number(localStorage.getItem(WIDTH_KEY)); return v >= PANEL_MIN && v <= PANEL_MAX ? v : PANEL_DEFAULT; } catch { return PANEL_DEFAULT; }
};
let lastRequest: { text: string; files: File[] } | null = null;
let returnFocus: HTMLElement | null = null;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Spanish message for each failure the contract / transport can produce. */
export function agentErrorMessage(e: unknown): string {
  const code = e instanceof AgentError ? e.code : (e as { code?: string })?.code ?? "";
  const status = e instanceof AgentError ? e.status : undefined;
  if (code === "CONNECTION_ERROR") return "Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.";
  if (code === "401" || status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (code === "403" || code === "FORBIDDEN" || status === 403) return "Tu rol no tiene permiso para esta consulta del asistente.";
  if (code === "AI_DISABLED" || code === "AGENT_DISABLED" || status === 503) return "El asistente no está disponible en este servidor.";
  if (code === "FILE_TOO_LARGE" || status === 413) return "Un archivo supera los 10 MB. Reduce la foto o divide el PDF.";
  if (code === "UNSUPPORTED_FILE" || code === "UNSUPPORTED_MEDIA_TYPE" || status === 415) return "Formato no admitido. Usa JPG, PNG, HEIC, WEBP o PDF.";
  if (code === "TOO_MANY_FILES") return "Puedes adjuntar hasta 5 archivos por mensaje.";
  if (code === "RATE_LIMITED" || status === 429) return "Demasiadas preguntas seguidas. Espera un momento.";
  const msg = (e as Error)?.message;
  // Backend messages are already in Spanish; transport errors from the browser are not.
  return msg && !/^(Request|Network|Failed|No response|Mock sin)/i.test(msg) ? msg : "El asistente no pudo responder. Inténtalo de nuevo.";
}

const isImage = (mime: string) => mime.startsWith("image/");
const toAttachment = (f: File): AgentAttachment => ({
  name: f.name, mime_type: f.type || "application/octet-stream", size: f.size,
  preview_url: isImage(f.type) ? URL.createObjectURL(f) : null,
});

/** Stored conversation → client parts (text first, then blocks, then proposals). */
export function fromStored(c: AgentConversation): ChatMessage[] {
  let lastImage: string | null = null;
  return c.messages.map((m) => {
    const img = m.attachments?.find((a) => a.mime_type?.startsWith("image/") && (a.preview_url || a.file_ref));
    if (m.role === "user") lastImage = img ? img.preview_url ?? `/agent/attachments/${img.file_ref}` : null;
    // An extraction is shown next to the photo it was read from.
    const blocks = (m.blocks ?? []).map((b) => (b.kind === "extraction" && !b.preview_url && lastImage ? { ...b, preview_url: lastImage } : b));
    return {
    id: m.id, role: m.role, attachments: m.attachments ?? [], createdAt: m.created_at,
    parts: [
      ...(m.text ? [{ kind: "text", text: m.text } as ChatPart] : []),
      ...blocks.map((block) => ({ kind: "block", block }) as ChatPart),
      ...(m.proposals ?? []).map((proposal) => ({ kind: "proposal", proposal }) as ChatPart),
    ],
    };
  });
}

export const useAssistant = create<AssistantState>((set, get) => {
  const patchMessage = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));

  const applyEvent = (messageId: string, e: AgentEvent) => {
    if (e.type === "conversation") { set({ conversationId: e.conversation_id }); return; }
    if (e.type === "done") return;
    if (e.type === "error") {
      const msg = agentErrorMessage({ code: e.code, message: e.message });
      patchMessage(messageId, (m) => ({ ...m, error: msg }));
      toast.error(msg, { id: "agent-error", action: { label: "Reintentar", onClick: () => get().retry() } });
      return;
    }
    patchMessage(messageId, (m) => {
      const parts = [...m.parts];
      const last = parts[parts.length - 1];
      if (e.type === "text") {
        if (last?.kind === "text") parts[parts.length - 1] = { ...last, text: last.text + e.delta };
        else parts.push({ kind: "text", text: e.delta });
      } else if (e.type === "tool") {
        const i = parts.findIndex((p) => p.kind === "tool" && p.id === e.id);
        const part: ChatPart = { kind: "tool", id: e.id, name: e.name, label: e.label, status: e.status };
        if (i >= 0) parts[i] = part; else parts.push(part);
      } else if (e.type === "block") {
        let block = e.block;
        if (block.kind === "extraction" && !block.preview_url) {
          // Show the photo the fields were read from, next to them.
          const users = get().messages.filter((x) => x.role === "user");
          const img = users[users.length - 1]?.attachments.find((a) => a.preview_url && a.mime_type.startsWith("image/"));
          if (img) block = { ...block, preview_url: img.preview_url };
        }
        parts.push({ kind: "block", block });
      } else if (e.type === "proposal") {
        parts.push({ kind: "proposal", proposal: { ...e.proposal, status: e.proposal.status ?? "pending" } });
      }
      return { ...m, parts };
    });
  };

  return {
    open: false,
    context: {},
    draft: "",
    draftVersion: 0,
    conversationId: null,
    messages: [],
    streaming: false,
    loadingConversation: false,
    historyVersion: 0,
    panelWidth: readWidth(),
    setPanelWidth: (w, persist) => {
      const v = Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, w)));
      set({ panelWidth: v });
      if (persist) { try { localStorage.setItem(WIDTH_KEY, String(v)); } catch { /* private mode */ } }
    },

    openAssistant: (opts = {}) => {
      if (!get().open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) returnFocus = document.activeElement;
      const s = get();
      const patientChanged = opts.patientId !== undefined && opts.patientId !== (s.context.patientId ?? null);
      // A new patient context starts a fresh conversation (the old one stays in the history).
      if (patientChanged && s.messages.length && !s.streaming) set({ conversationId: null, messages: [] });
      set({
        open: true,
        context: opts.patientId !== undefined ? { patientId: opts.patientId, patientName: opts.patientName ?? null } : s.context,
        ...(opts.prompt !== undefined ? { draft: opts.prompt, draftVersion: s.draftVersion + 1 } : {}),
      });
    },
    closeAssistant: () => {
      set({ open: false });
      const el = returnFocus;
      returnFocus = null;
      if (el && document.contains(el)) requestAnimationFrame(() => el.focus());
    },
    toggleAssistant: () => (get().open ? get().closeAssistant() : get().openAssistant()),
    clearContext: () => set({ context: {} }),

    send: async (text, files = []) => {
      const trimmed = text.trim();
      if (get().streaming || (!trimmed && !files.length)) return;
      lastRequest = { text: trimmed, files };
      const user: ChatMessage = {
        id: uid("u"), role: "user", parts: trimmed ? [{ kind: "text", text: trimmed }] : [],
        attachments: files.map(toAttachment), createdAt: new Date().toISOString(),
      };
      const reply: ChatMessage = { id: uid("a"), role: "assistant", parts: [], attachments: [], createdAt: new Date().toISOString(), streaming: true };
      set((s) => ({ messages: [...s.messages, user, reply], streaming: true }));
      controller = new AbortController();
      try {
        await agentEndpoints.streamChat({
          message: trimmed || "Revisa los archivos adjuntos.",
          conversationId: get().conversationId,
          patientId: get().context.patientId ?? null,
          files,
          signal: controller.signal,
          onEvent: (e) => applyEvent(reply.id, e),
        });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          patchMessage(reply.id, (m) => ({ ...m, parts: [...m.parts.map((p) => (p.kind === "tool" && p.status === "running" ? { ...p, status: "error" as const } : p)), { kind: "text", text: m.parts.some((p) => p.kind === "text") ? "\n\n_Respuesta detenida._" : "_Respuesta detenida._" }] }));
        } else {
          const msg = agentErrorMessage(e);
          patchMessage(reply.id, (m) => ({ ...m, error: msg }));
          toast.error(msg, { id: "agent-error", action: { label: "Reintentar", onClick: () => get().retry() } });
        }
      } finally {
        controller = null;
        patchMessage(reply.id, (m) => ({ ...m, streaming: false, parts: m.parts.map((p) => (p.kind === "tool" && p.status === "running" ? { ...p, status: "done" as const } : p)) }));
        set((s) => ({ streaming: false, historyVersion: s.historyVersion + 1 }));
      }
    },
    stop: () => controller?.abort(),
    retry: () => {
      if (!lastRequest || get().streaming) return;
      const req = lastRequest;
      // Drop the failed exchange, then resend it.
      set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant" && last.error) msgs.splice(-2, 2);
        return { messages: msgs };
      });
      void get().send(req.text, req.files);
    },
    newChat: () => {
      get().stop();
      set({ conversationId: null, messages: [], draft: "", draftVersion: get().draftVersion + 1 });
    },
    loadConversation: async (id) => {
      get().stop();
      set({ loadingConversation: true });
      try {
        const c = await agentEndpoints.conversation(id);
        set({ conversationId: c.id, messages: fromStored(c), context: c.patient_id ? { patientId: c.patient_id, patientName: get().context.patientId === c.patient_id ? get().context.patientName : null } : {} });
      } catch (e) {
        toast.error(`No se pudo abrir la conversación. ${agentErrorMessage(e)}`, { action: { label: "Reintentar", onClick: () => void get().loadConversation(id) } });
      } finally {
        set({ loadingConversation: false });
      }
    },
    forgetConversation: (id) => {
      if (get().conversationId === id) set({ conversationId: null, messages: [] });
    },
    updateProposal: (messageId, proposalId, patch) => patchMessage(messageId, (m) => ({
      ...m, parts: m.parts.map((p) => (p.kind === "proposal" && p.proposal.id === proposalId ? { ...p, proposal: { ...p.proposal, ...patch } } : p)),
    })),
  };
});

/** Public entry point (patient profile, top bar, shortcuts). */
export const openAssistant = (opts?: OpenAssistantOptions) => useAssistant.getState().openAssistant(opts);
