/** Asistente (agent chat) — mirrors ../AGENT_CHAT_CONTRACT.md. */

export interface AgentUsage { input_tokens: number; output_tokens: number; cost_estimate_usd: number }

export type ToolStatus = "running" | "done" | "error";

export interface AgentTableBlock { kind: "table"; title?: string; columns: string[]; rows: Array<Array<string | number | null>> }
export interface AgentChartBlock {
  kind: "chart"; title?: string; chart: "line" | "bar"; x?: string;
  series: Array<{ name: string; points: Array<{ x: string; y: number }> }>;
}
export interface AgentCode { code: string; description: string; count?: number }
export interface AgentPatientBlock {
  kind: "patient";
  patient: { id: string; name: string; age?: number | null; sex?: string | null; doctor?: string | null; active_codes?: AgentCode[] };
}
export interface AgentCodesBlock { kind: "codes"; title?: string; codes: AgentCode[] }
export interface AgentExtractionField { key: string; label: string; value: string | number | null; confidence?: number | null }
export interface AgentExtractionBlock {
  kind: "extraction"; document_name: string; document_type?: string; fields: AgentExtractionField[];
  /** Client-side: object URL / preview_url of the image the fields were read from. */
  preview_url?: string | null;
}
export type AgentBlock = AgentTableBlock | AgentChartBlock | AgentPatientBlock | AgentCodesBlock | AgentExtractionBlock;

export type ProposalType = "attach_document" | "apply_extraction" | "create_patient" | "draft_consultation_note";
export type ProposalStatus = "pending" | "applied" | "rejected";
export interface AgentProposal {
  id: string;
  type: ProposalType | string;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
  status: ProposalStatus;
  /** Client-side: what confirm returned. */
  result?: Record<string, unknown> | null;
}

export type AgentEvent =
  | { type: "conversation"; conversation_id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; label: string; status: ToolStatus }
  | { type: "block"; block: AgentBlock }
  | { type: "proposal"; proposal: AgentProposal }
  | { type: "error"; message: string; code?: string }
  | { type: "done"; message_id: string; usage?: AgentUsage };

/** preview_url from the backend is `/agent/attachments/{file_ref}` (needs the bearer token). */
export interface AgentAttachment { file_ref?: string | null; document_id?: string | null; name: string; mime_type: string; preview_url?: string | null; size?: number }

export interface AgentConversationSummary { id: string; title: string; patient_id: string | null; updated_at: string }
export interface AgentStoredMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments: AgentAttachment[];
  blocks: AgentBlock[];
  proposals: AgentProposal[];
  usage?: AgentUsage;
  created_at: string;
}
export interface AgentConversation { id: string; title: string; patient_id: string | null; usage?: AgentUsage; messages: AgentStoredMessage[] }

/** apply_extraction: `document_id` is null while the file is still a chat attachment (`file_ref`). */
export interface ApplyExtractionPayload {
  document_id: string | null; file_ref?: string | null; patient_id?: string | null; document_type?: string;
  fields: Array<{ key: string; label?: string; value: string | number | null; confidence?: number | null }>;
}

export interface ConfirmResult { status: "applied"; result: Record<string, unknown> }

/** Client message model: parts keep the stream order (tool chips → text → blocks → proposals). */
export type ChatPart =
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; label: string; status: ToolStatus }
  | { kind: "block"; block: AgentBlock }
  | { kind: "proposal"; proposal: AgentProposal };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
  attachments: AgentAttachment[];
  createdAt: string;
  /** Assistant message still receiving events. */
  streaming?: boolean;
  error?: string | null;
}
