import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import clsx from "clsx";
import { MessageSquare, SquarePen, Trash2 } from "lucide-react";
import InlineState from "../../../components/clinical/InlineState";
import { agentEndpoints } from "../../../services/endpoints/agent";
import { useAssistant } from "../store";
import type { AgentConversationSummary } from "../../../types/agent";

const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "ayer";
  if (days < 7) return d.toLocaleDateString("es-DO", { weekday: "long" });
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
};

/** Conversation history: new chat, open, delete (with a 5 s undo). */
export default function History({ onPicked }: { onPicked?: () => void }) {
  const { conversationId, historyVersion, newChat, loadConversation, forgetConversation } = useAssistant();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, number>());
  const q = useQuery({ queryKey: ["agent", "conversations", historyVersion], queryFn: () => agentEndpoints.conversations(20), staleTime: 30_000, retry: 1 });
  const items = (q.data ?? []).filter((c) => !hidden.has(c.id));

  const remove = (c: AgentConversationSummary) => {
    setHidden((s) => new Set(s).add(c.id));
    forgetConversation(c.id);
    const undo = () => {
      window.clearTimeout(timers.current.get(c.id));
      timers.current.delete(c.id);
      setHidden((s) => { const n = new Set(s); n.delete(c.id); return n; });
    };
    toast("Conversación eliminada", { description: "Los documentos ya guardados en fichas no se borran.", action: { label: "Deshacer", onClick: undo }, duration: 5000 });
    timers.current.set(c.id, window.setTimeout(async () => {
      timers.current.delete(c.id);
      try { await agentEndpoints.deleteConversation(c.id); void qc.invalidateQueries({ queryKey: ["agent", "conversations"] }); }
      catch { toast.error("No se pudo eliminar la conversación."); setHidden((s) => { const n = new Set(s); n.delete(c.id); return n; }); }
    }, 5000));
  };

  return (
    <nav className="as-history" aria-label="Conversaciones">
      <button type="button" className="as-history-new" onClick={() => { newChat(); onPicked?.(); }}>
        <SquarePen size={18} aria-hidden="true" /><span>Nueva conversación</span>
      </button>
      <p className="as-history-title">Recientes</p>
      {q.isLoading ? (
        <div className="as-history-skeleton">{[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 44 }} />)}</div>
      ) : q.isError ? (
        <InlineState kind="error" message="No se pudo cargar el historial." onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <p className="as-muted as-history-empty">Aún no hay conversaciones. Las preguntas que hagas quedarán aquí.</p>
      ) : (
        <ul className="as-history-list">
          {items.map((c) => (
            <li key={c.id} className={clsx("as-history-item", c.id === conversationId && "is-current")}>
              <button type="button" className="as-history-open" aria-current={c.id === conversationId || undefined}
                onClick={() => { void loadConversation(c.id); onPicked?.(); }}>
                <MessageSquare size={16} aria-hidden="true" />
                <span className="as-history-copy">
                  <span className="as-history-name" title={c.title}>{c.title || "Conversación sin título"}</span>
                  <span className="as-history-when">{when(c.updated_at)}</span>
                </span>
              </button>
              <button type="button" className="as-history-delete" onClick={() => remove(c)} aria-label={`Eliminar «${c.title}»`}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
