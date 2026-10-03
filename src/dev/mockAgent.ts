/**
 * Development-only mock of /agent/* (AGENT_CHAT_CONTRACT.md). POST /agent/chat is simulated as an
 * SSE stream (conversation → tool chips → text deltas → blocks → proposals → done) with realistic
 * delays; the JSON endpoints go through the axios adapter installed by mock.ts.
 */
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { httpClient } from "../services/http";
import { AgentError, setAgentStreamImpl, type StreamChatInput } from "../services/endpoints/agent";
import type { AgentBlock, AgentConversation, AgentEvent, AgentProposal, AgentStoredMessage } from "../types/agent";

const params = new URLSearchParams(location.search);
const worst = params.get("data") === "worst";
const role = params.get("role") || "admin";
const LONG = "María de los Ángeles Fernanda de la Santísima Trinidad Fernández de Córdoba";
const P = worst
  ? [LONG, "J", "Đặng Thị Ngọc Hân", "王小明", "Ana María Pérez Al-Rashid", "José Luis Gutiérrez"]
  : ["Elena Rodríguez", "Carlos Mendoza", "Ana María Pérez", "José Luis Gutiérrez", "Teresa Almonte Reyes", "Rosa Santos Núñez", "Juan Díaz Herrera"];
const pid = (i: number) => `patient-${i + 1}`;
const now = () => new Date().toISOString();
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const shortDay = (d: number) => new Date(Date.now() - d * 86400000).toLocaleDateString("es-DO", { day: "numeric", month: "short" });

// A small "lab report" picture so the demo extraction has a real thumbnail.
const LAB_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="#fbfaf7"/><rect x="20" y="20" width="260" height="44" rx="6" fill="#2a78d6" opacity=".9"/><text x="34" y="48" font-family="Arial" font-size="16" fill="#fff" font-weight="700">LABORATORIO CLÍNICO</text>${Array.from({ length: 11 }, (_, i) => `<rect x="30" y="${92 + i * 26}" width="${[120, 90, 140, 100, 80, 130, 110, 95, 125, 85, 105][i]}" height="8" rx="4" fill="#9aa3ad"/><rect x="200" y="${92 + i * 26}" width="60" height="8" rx="4" fill="#5d6670"/>`).join("")}<rect x="30" y="370" width="90" height="6" rx="3" fill="#c3c8ce"/></svg>`)}`;

const PAIN = [["R52.2", "Otro dolor crónico"], ["J18.9", "Neumonía, no especificada"], ["R06.0", "Disnea"], ["C34.9", worst ? "Tumor maligno de los bronquios o del pulmón, parte no especificada, con extensión ganglionar mediastínica bilateral" : "Tumor maligno de los bronquios o del pulmón, parte no especificada"]] as const;

// ---------------------------------------------------------------------------
// Canned blocks / proposals
// ---------------------------------------------------------------------------
const followupTable = (): AgentBlock => ({
  kind: "table", title: "Pacientes activos sin consulta en más de 14 días",
  columns: ["Paciente", "Última consulta", "Días sin control", "Médico"],
  rows: [[P[4], shortDay(64), 64, "Dra. Lucía Mendoza"], [P[6], shortDay(31), 31, "Dr. Andrés Medina"], [P[1], shortDay(22), 22, "Dra. Lucía Mendoza"], [P[5 % P.length], shortDay(17), 17, "Dra. Paula Castillo"]],
});
const trendChart = (): AgentBlock => ({
  kind: "chart", title: "Casos por semana · últimas 8 semanas", chart: "line", x: "Semana",
  series: [
    { name: "J18.9 Neumonía", points: [1, 0, 1, 1, 2, 3, 5, 8].map((y, i) => ({ x: shortDay((7 - i) * 7), y })) },
    { name: "R52.2 Dolor crónico", points: [6, 7, 5, 6, 7, 6, 8, 7].map((y, i) => ({ x: shortDay((7 - i) * 7), y })) },
  ],
});
const risingCodes = (): AgentBlock => ({
  kind: "codes", title: "Aumentaron este mes",
  codes: [{ code: "J18.9", description: PAIN[1][1], count: 9 }, { code: "R06.0", description: "Disnea", count: 7 }, { code: "R11", description: "Náusea y vómito", count: 4 }],
});
const patientCard = (i = 0): AgentBlock => ({
  kind: "patient",
  patient: { id: pid(i), name: P[i], age: 72, sex: i % 2 ? "male" : "female", doctor: "Dra. Lucía Mendoza",
    active_codes: [{ code: PAIN[3][0], description: PAIN[3][1] }, { code: "R52.2", description: "Otro dolor crónico" }, { code: "R06.0", description: "Disnea" }] },
});
const labFields = () => [
  { key: "patient_name", label: "Paciente", value: P[0], confidence: 0.96 },
  { key: "sample_date", label: "Fecha de la muestra", value: shortDay(1), confidence: 0.93 },
  { key: "hemoglobin", label: "Hemoglobina", value: "10.2 g/dL", confidence: 0.97 },
  { key: "leukocytes", label: "Leucocitos", value: "11 400 /µL", confidence: 0.88 },
  { key: "platelets", label: "Plaquetas", value: "182 000 /µL", confidence: 0.74 },
  { key: "creatinine", label: "Creatinina", value: "1.4 mg/dL", confidence: 0.52 },
];
const extraction = (name: string, preview: string | null): AgentBlock => ({ kind: "extraction", document_name: name, document_type: "Resultado de laboratorio", fields: labFields(), preview_url: preview });

let seq = 1;
/** file_ref → uploaded blob, served by GET /agent/attachments/{file_ref}. */
const filesStore = new Map<string, Blob>();
const svgBlob = () => new Blob([decodeURIComponent(LAB_SVG.slice(LAB_SVG.indexOf(",") + 1))], { type: "image/svg+xml" });
const proposals = new Map<string, AgentProposal>();
const mkProposal = (type: AgentProposal["type"], title: string, description: string, payload: Record<string, unknown>): AgentProposal => {
  const p: AgentProposal = { id: `prop-${seq++}`, type, title, description, payload, status: "pending" };
  proposals.set(p.id, p);
  return p;
};
const attachProposal = (name: string, fileRef = `att-${seq}`) => mkProposal("attach_document", "Guardar el documento en la ficha",
  `Se guardará «${name}» en Documentos de ${P[0]}.`, { patient_id: pid(0), patient_name: P[0], file_ref: fileRef, document_type: "lab_result", title: `Hemograma y química · ${shortDay(1)}` });
const applyProposal = (fileRef: string | null = null) => mkProposal("apply_extraction", "Registrar los valores del laboratorio",
  "Se añadirán 6 valores al historial de laboratorio. Revisa la creatinina: se leyó con poca seguridad.",
  // Like the backend: document_id stays null while the file is only a chat attachment.
  { document_id: fileRef ? null : "document-1", file_ref: fileRef, patient_id: pid(0), patient_name: P[0], document_type: "lab_result", fields: labFields() });
const createPatientProposal = () => mkProposal("create_patient", "Crear paciente desde la cédula", "Datos leídos del documento de identidad. Nada se crea hasta que confirmes.",
  { first_name: worst ? "María de los Ángeles Fernanda" : "Lucía", last_name: worst ? "de la Santísima Trinidad Fernández de Córdoba" : "Batista Reyes", document_number: "001-1234567-8", birth_date: "1951-03-14", gender: "female", phone: "809-555-0142" });
const draftProposal = (i = 0) => mkProposal("draft_consultation_note", "Preparar borrador de consulta", "Se creará un borrador (sin firmar) con esta nota para que la revises.",
  { patient_id: pid(i), patient_name: P[i], soap: {
    subjective: "Refiere dolor torácico 6/10 que mejora con la morfina de rescate. Disnea de pequeños esfuerzos.",
    objective: "SatO2 92 % aire ambiente. FR 22. Crepitantes en base derecha.",
    assessment: "Dolor oncológico parcialmente controlado. Disnea en progresión.",
    plan: "Ajustar dosis basal de morfina. Oxígeno domiciliario 2 L/min. Control en 7 días.",
  }, icd10: ["R52.2", "R06.0"] });

// ---------------------------------------------------------------------------
// In-memory conversations
// ---------------------------------------------------------------------------
const convs = new Map<string, AgentConversation & { updated_at: string }>();
const stored = (role_: "user" | "assistant", text: string, extra: Partial<AgentStoredMessage> = {}, daysAgo = 0): AgentStoredMessage =>
  ({ id: `m-${seq++}`, role: role_, text, attachments: [], blocks: [], proposals: [], created_at: ago(daysAgo), ...extra });

function seed() {
  const applied = { ...draftProposal(0), status: "applied" as const, result: { consultation_id: "consultation-1", patient_id: pid(0) } };
  filesStore.set("att-demo", svgBlob());
  const pending = applyProposal("att-demo");
  const attach = { ...attachProposal("hemograma-octubre.jpg", "att-demo"), status: "applied" as const, result: { document_id: "document-1", patient_id: pid(0) } };
  convs.set("conv-demo", {
    id: "conv-demo", title: "¿Qué pacientes no tienen seguimiento?", patient_id: null, updated_at: ago(0),
    messages: [
      stored("user", "¿Qué pacientes no tienen seguimiento?"),
      stored("assistant", `Hay **4 pacientes activos** sin consulta en más de 14 días. La más atrasada es **${P[4]}** (64 días).\n\n- 2 son de la Dra. Lucía Mendoza\n- Sugiero llamar primero a quienes tienen dolor no controlado`, { blocks: [followupTable()] }),
      stored("user", "¿Qué diagnósticos aumentaron este mes?"),
      stored("assistant", "La **neumonía (J18.9)** pasó de 1 a 8 casos por semana en el último mes; el dolor crónico se mantiene estable. Lo marco como _para vigilar_.", { blocks: [trendChart(), risingCodes()] }),
      stored("user", `Resume a ${P[0]} y prepara la nota de hoy`),
      stored("assistant", `**${P[0]}**, 72 años, cáncer de pulmón en seguimiento paliativo.\n\n1. Dolor crónico controlado con morfina, con rescates 2 veces al día\n2. Disnea en aumento en las 2 últimas consultas\n3. Última consulta hace 3 días ([ver consulta](/consultations/consultation-1))`, { blocks: [patientCard(0)], proposals: [applied] }),
      stored("user", "Lee este resultado y guárdalo en su ficha", { attachments: [{ file_ref: "att-demo", document_id: null, name: "hemograma-octubre.jpg", mime_type: "image/svg+xml", preview_url: "/agent/attachments/att-demo" }] }),
      stored("assistant", "Leí el **hemograma**. La hemoglobina está baja (10.2 g/dL) y la creatinina se leyó con poca seguridad: revísala antes de confirmar.", { blocks: [extraction("hemograma-octubre.jpg", null)], proposals: [attach, pending] }),
    ],
  });
  const old = (id: string, title: string, d: number, patient: string | null = null) => convs.set(id, { id, title, patient_id: patient, updated_at: ago(d), messages: [stored("user", title, {}, d), stored("assistant", "Listo. Revisa la tabla.", { blocks: [followupTable()] }, d)] });
  old("conv-2", `Resume a ${P[2]}`, 1, pid(2));
  old("conv-3", worst ? "¿Cuántos pacientes con dolor oncológico intratable y disnea progresiva tuvieron más de tres consultas en el último trimestre?" : "Facturas pendientes de cobro", 3);
  old("conv-4", "¿Qué diagnósticos aumentaron este mes?", 9);
}
seed();

// ---------------------------------------------------------------------------
// Streaming simulation
// ---------------------------------------------------------------------------
const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) { reject(new DOMException("Detenido", "AbortError")); return; }
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Detenido", "AbortError")); }, { once: true });
});

type Step = { tool?: [string, string]; text?: string; block?: AgentBlock; proposal?: AgentProposal };

function plan(message: string, files: File[], patientId?: string | null, fileRef: string | null = null): Step[] {
  const m = message.toLowerCase();
  const ctxIdx = patientId ? Math.max(0, Number(patientId.replace(/\D/g, "")) - 1) % P.length : 0;
  const clinicalBlocked = role === "secretary";
  if (files.length) {
    const f = files[0];
    const preview = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    if (/c[eé]dula|identidad|crear paciente|dni/.test(m)) {
      return [
        { tool: ["read_attachment", "Leyendo el documento…"] },
        { tool: ["search_patients", "Buscando si ya existe el paciente…"] },
        { text: "Es un **documento de identidad**. No encontré a nadie con ese número, así que preparé la ficha nueva para que la confirmes." },
        { proposal: createPatientProposal() },
      ];
    }
    return [
      { tool: ["read_attachment", `Leyendo ${f.type === "application/pdf" ? "el PDF" : "la foto"}…`] },
      { tool: ["search_patients", "Buscando al paciente…"] },
      { text: `Leí **${f.name}**${files.length > 1 ? ` y ${files.length - 1} archivo(s) más` : ""}: es un resultado de laboratorio de **${P[ctxIdx]}**. La creatinina se leyó con poca seguridad; revísala antes de confirmar.` },
      { block: extraction(f.name, preview) },
      { proposal: attachProposal(f.name, fileRef ?? undefined) },
      { proposal: applyProposal(fileRef) },
    ];
  }
  if (m.includes("#error")) return [{ tool: ["search_patients", "Buscando pacientes…"] }, { text: "Un momento…" }];
  if (/factura|cobro|cobrar/.test(m)) {
    return [
      { tool: ["dashboard_alerts", "Revisando facturas pendientes…"] },
      { text: "Hay **3 facturas** emitidas hace más de 30 días sin pagar completas." },
      { block: { kind: "table", title: "Facturas vencidas", columns: ["Paciente", "Factura", "Días", "Pendiente (RD$)"], rows: [[P[0], "FAC-2026-001", 74, worst ? 9876543.21 : 1000], [P[1], "FAC-2026-002", 45, worst ? 12345678.9 : 3500], [P[2], "FAC-2026-004", 33, 850]] } },
    ];
  }
  if (clinicalBlocked && /diagn[oó]stic|resum|nota|consulta|epidemi/.test(m)) {
    return [{ text: "Con tu rol de **secretaria** no tengo acceso a datos clínicos (diagnósticos, notas ni resúmenes). Puedo ayudarte con pacientes, seguimientos, documentos y facturas." }];
  }
  if (/seguimiento|control|atrasad/.test(m)) {
    return [
      { tool: ["dashboard_alerts", "Revisando alertas…"] },
      { tool: ["search_patients", "Buscando pacientes…"] },
      { text: `Hay **4 pacientes activos** sin consulta en más de 14 días. La más atrasada es **${P[4]}** (64 días).\n\n- 2 son de la Dra. Lucía Mendoza\n- Sugiero llamar primero a quienes tienen dolor no controlado` },
      { block: followupTable() },
    ];
  }
  if (/aument|diagn[oó]stic|epidemi|tendencia/.test(m)) {
    return [
      { tool: ["epi_insights", "Analizando diagnósticos…"] },
      { tool: ["epi_trend", "Calculando la tendencia…"] },
      { text: "La **neumonía (J18.9)** pasó de 1 a 8 casos por semana en el último mes. El dolor crónico se mantiene estable. Lo marco como _para vigilar_." },
      { block: trendChart() },
      { block: risingCodes() },
    ];
  }
  if (/nota|consulta|soap|borrador/.test(m)) {
    return [
      { tool: ["get_patient", "Abriendo la ficha…"] },
      { tool: ["get_patient_timeline", "Leyendo las últimas consultas…"] },
      { text: `Preparé un **borrador** de la consulta de hoy para **${P[ctxIdx]}** a partir de su historia. Corrige lo que haga falta antes de confirmar.` },
      { proposal: draftProposal(ctxIdx) },
    ];
  }
  if (/crear paciente|nuevo paciente/.test(m)) {
    return [{ text: "Puedo crear la ficha a partir de una foto de la cédula. Mientras tanto, preparé estos datos de ejemplo:" }, { proposal: createPatientProposal() }];
  }
  const named = P.findIndex((n) => n.length > 2 && m.includes(n.toLowerCase().split(" ")[0]));
  if (/resum/.test(m) || named >= 0 || patientId) {
    const i = named >= 0 ? named : ctxIdx;
    return [
      { tool: ["search_patients", "Buscando al paciente…"] },
      { tool: ["get_patient_ai_summary", "Leyendo su historia…"] },
      { block: patientCard(i) },
      { text: `**${P[i]}**, 72 años, en seguimiento paliativo por cáncer de pulmón.\n\n1. Dolor crónico controlado con morfina; usa rescates 2 veces al día\n2. Disnea en aumento en las 2 últimas consultas\n3. Última consulta hace 3 días ([ver consulta](/consultations/consultation-1))\n\n¿Quieres que prepare la nota de hoy?` },
    ];
  }
  return [{ text: "Puedo **buscar pacientes**, **resumir historias**, mostrar **tendencias de diagnósticos**, leer **fotos de resultados o recetas** y preparar cambios que tú confirmas.\n\nPrueba: _¿Qué pacientes no tienen seguimiento?_" }];
}

async function streamMock({ message, conversationId, patientId, files = [], signal, onEvent }: StreamChatInput) {
  if (files.length > 5) throw new AgentError("TOO_MANY_FILES", "", 400);
  if (files.some((f) => f.size > 10 * 1024 * 1024)) throw new AgentError("FILE_TOO_LARGE", "", 413);
  await wait(250, signal);
  const id = conversationId && convs.has(conversationId) ? conversationId : `conv-${Date.now().toString(36)}`;
  if (!convs.has(id)) convs.set(id, { id, title: (message.trim() || files[0]?.name || "Conversación").slice(0, 80), patient_id: patientId ?? null, updated_at: now(), messages: [] });
  const conv = convs.get(id)!;
  const refs = files.map((f) => { const ref = `att-${seq++}`; filesStore.set(ref, f); return ref; });
  conv.messages.push(stored("user", message, { attachments: files.map((f, i) => ({ file_ref: refs[i], document_id: null, name: f.name, mime_type: f.type, preview_url: `/agent/attachments/${refs[i]}` })) }));
  onEvent({ type: "conversation", conversation_id: id });
  const reply = stored("assistant", "");
  const emit = (e: AgentEvent) => {
    onEvent(e);
    if (e.type === "text") reply.text += e.delta;
    if (e.type === "block") reply.blocks.push(e.block);
    if (e.type === "proposal") reply.proposals.push(e.proposal);
  };
  let n = 0;
  for (const step of plan(message, files, patientId, refs[0] ?? null)) {
    if (step.tool) {
      const tid = `tool-${n++}`;
      emit({ type: "tool", id: tid, name: step.tool[0], label: step.tool[1], status: "running" });
      await wait(450 + Math.random() * 350, signal);
      emit({ type: "tool", id: tid, name: step.tool[0], label: step.tool[1], status: "done" });
    }
    if (step.text) {
      const chunks = step.text.match(/[\s\S]{1,5}/g) ?? [];
      for (const c of chunks) { emit({ type: "text", delta: c }); await wait(16, signal); }
      emit({ type: "text", delta: "\n\n" });
    }
    if (step.block) { await wait(180, signal); emit({ type: "block", block: step.block }); }
    if (step.proposal) { await wait(220, signal); emit({ type: "proposal", proposal: step.proposal }); }
  }
  if (message.toLowerCase().includes("#error")) {
    emit({ type: "error", code: "AI_DISABLED", message: "El asistente no está disponible en este servidor." });
    return;
  }
  reply.text = reply.text.trim();
  conv.messages.push(reply);
  conv.updated_at = now();
  emit({ type: "done", message_id: reply.id, usage: { input_tokens: 1200, output_tokens: 180, cost_estimate_usd: 0.0021 } });
}

// ---------------------------------------------------------------------------
// JSON endpoints
// ---------------------------------------------------------------------------
function confirmResult(p: AgentProposal, edits: Record<string, unknown>) {
  const pl = p.payload as Record<string, string>;
  if (p.type === "attach_document") return { document_id: "document-1", patient_id: pl.patient_id, title: edits.title ?? pl.title };
  if (p.type === "apply_extraction") return { document_id: pl.document_id ?? "document-1", extraction_result_id: "extraction-1", validated: true, applied_to_domain: false, edited: Boolean(edits.fields) };
  if (p.type === "create_patient") return { patient_id: "patient-1", full_name: `${edits.first_name ?? pl.first_name} ${edits.last_name ?? pl.last_name}` };
  if (p.type === "draft_consultation_note") return { consultation_id: "consultation-1", consultation_version: 1, diagnoses_added: 2, status: "draft" };
  return {};
}

function handle(method: string, path: string, query: Record<string, string>, body: Record<string, unknown>): unknown {
  const parts = path.split("/").filter(Boolean); // agent, conversations, id
  if (parts[1] === "conversations") {
    if (!parts[2] && method === "get") {
      return [...convs.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, Number(query.limit || 20))
        .map(({ id, title, patient_id, updated_at }) => ({ id, title, patient_id, updated_at }));
    }
    const c = convs.get(parts[2]);
    if (!c) throw { response: { status: 404, data: { error: { code: "NOT_FOUND", message: "La conversación no existe." } } } };
    if (method === "delete") { convs.delete(parts[2]); return null; }
    return { id: c.id, title: c.title, patient_id: c.patient_id, messages: c.messages };
  }
  if (parts[1] === "attachments" && method === "get") {
    const blob = filesStore.get(parts[2]);
    if (!blob) throw { response: { status: 404, data: { error: { code: "NOT_FOUND", message: "El archivo temporal ya expiró." } } } };
    return blob;
  }
  if (parts[1] === "proposals" && method === "post") {
    const p = proposals.get(parts[2]);
    if (!p) throw { response: { status: 404, data: { error: { code: "NOT_FOUND", message: "La propuesta ya no existe." } } } };
    if (parts[3] === "reject") { p.status = "rejected"; return { status: "rejected" }; }
    const edits = (body.edits ?? {}) as Record<string, unknown>;
    p.status = "applied";
    return { status: "applied", result: confirmResult(p, edits) };
  }
  throw new Error(`Mock sin fixture: ${path}`);
}

/** Wraps the preview adapter (mock.ts) and swaps the SSE transport. DEV only. */
export function installAgentMock() {
  setAgentStreamImpl(streamMock);
  const prev = httpClient.defaults.adapter as AxiosAdapter;
  httpClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
    const path = (config.url || "").split("?")[0];
    if (!path.startsWith("/agent/")) return prev(config);
    const method = (config.method || "get").toLowerCase();
    const query = Object.fromEntries(Object.entries(config.params || {}).map(([k, v]) => [k, String(v)]));
    const body = typeof config.data === "string" ? (() => { try { return JSON.parse(config.data); } catch { return {}; } })() : (config.data || {});
    await new Promise((r) => setTimeout(r, method === "post" ? 450 : 120));
    const data = handle(method, path, query, body);
    return { data, status: 200, statusText: "OK", headers: {}, config };
  }) as AxiosAdapter;
}
