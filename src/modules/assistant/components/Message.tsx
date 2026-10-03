import { memo } from "react";
import { AlertCircle, Check, FileText, RotateCcw, X } from "lucide-react";
import Markdown from "./Markdown";
import Block from "./Blocks";
import ProposalCard from "./ProposalCard";
import { useAssistant } from "../store";
import { usePreview } from "../usePreview";
import type { AgentAttachment } from "../../../types/agent";
import type { ChatMessage, ChatPart } from "../../../types/agent";

type ToolPart = Extract<ChatPart, { kind: "tool" }>;

function ToolChips({ tools }: { tools: ToolPart[] }) {
  return (
    <ul className="as-tools" aria-label="Actividad del asistente">
      {tools.map((t) => (
        <li key={t.id} className="as-tool" data-status={t.status}>
          {t.status === "running" ? <span className="as-spinner" aria-hidden="true" /> : t.status === "done" ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
          <span>{t.status === "running" ? t.label : t.label.replace(/…$|\.\.\.$/, "")}</span>
          <span className="sr-only">{t.status === "running" ? "en curso" : t.status === "done" ? "listo" : "falló"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Groups consecutive tool parts into one chip row; keeps the rest in stream order. */
function groupParts(parts: ChatPart[]) {
  const out: Array<{ key: string; tools?: ToolPart[]; part?: ChatPart }> = [];
  parts.forEach((p, i) => {
    const prev = out[out.length - 1];
    if (p.kind === "tool") {
      if (prev?.tools) prev.tools.push(p);
      else out.push({ key: `t${i}`, tools: [p] });
    } else out.push({ key: `p${i}`, part: p });
  });
  return out;
}

function AttachmentThumb({ a }: { a: AgentAttachment }) {
  const isImg = a.mime_type.startsWith("image/");
  const src = usePreview(isImg ? a.preview_url : null);
  return src ? <img src={src} alt={a.name} /> : <span className="as-attachment-file"><FileText size={18} aria-hidden="true" /><span>{a.name}</span></span>;
}

function Attachments({ m }: { m: ChatMessage }) {
  if (!m.attachments.length) return null;
  return (
    <ul className="as-attachments" aria-label="Archivos adjuntos">
      {m.attachments.map((a, i) => (
        <li key={`${a.name}-${i}`} className="as-attachment" title={a.name}>
          <AttachmentThumb a={a} />
        </li>
      ))}
    </ul>
  );
}

function Message({ m, isLast }: { m: ChatMessage; isLast: boolean }) {
  const retry = useAssistant((s) => s.retry);
  if (m.role === "user") {
    const text = m.parts.find((p) => p.kind === "text");
    return (
      <div className="as-msg is-user">
        <Attachments m={m} />
        {text?.kind === "text" && <div className="as-bubble">{text.text}</div>}
      </div>
    );
  }
  const groups = groupParts(m.parts);
  const empty = !m.parts.length;
  const lastIsText = m.parts[m.parts.length - 1]?.kind === "text";
  return (
    <div className="as-msg is-assistant" aria-busy={m.streaming || undefined}>
      <span className="as-msg-mark" aria-hidden="true">✦</span>
      <div className="as-msg-body">
        {empty && m.streaming && <p className="as-thinking"><span className="as-dots" aria-hidden="true"><i /><i /><i /></span>Pensando…</p>}
        {groups.map((g) => {
          if (g.tools) return <ToolChips key={g.key} tools={g.tools} />;
          const p = g.part!;
          if (p.kind === "text") return <div key={g.key} className={m.streaming && lastIsText && g === groups[groups.length - 1] ? "as-text is-streaming" : "as-text"}><Markdown text={p.text} /></div>;
          if (p.kind === "block") return <Block key={g.key} block={p.block} />;
          if (p.kind === "proposal") return <ProposalCard key={p.proposal.id} proposal={p.proposal} messageId={m.id} />;
          return null;
        })}
        {m.error && (
          <div className="as-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{m.error}</span>
            {isLast && <button type="button" className="as-chip-button" onClick={retry}><RotateCcw size={16} aria-hidden="true" /><span>Reintentar</span></button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(Message);
