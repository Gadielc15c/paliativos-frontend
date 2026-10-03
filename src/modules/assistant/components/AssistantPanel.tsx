import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { PANEL_MAX, PANEL_MIN, useAssistant } from "../store";
import AssistantChat from "./AssistantChat";

export const ASSISTANT_PATH = "/asistente";

/**
 * Global wiring, mounted once in AppLayout: Ctrl/Cmd+K, ?assistant=open, DEV ?demo=chat
 * and the panel itself (right column on desktop, full-screen sheet on phones).
 */
export default function AssistantPanel() {
  const { open, closeAssistant, openAssistant, panelWidth, setPanelWidth } = useAssistant();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const compact = useIsCompact();
  const onPage = pathname === ASSISTANT_PATH;
  const panel = useRef<HTMLElement | null>(null);

  // Deep links: ?assistant=open on any route; DEV previews of a filled conversation.
  useEffect(() => {
    const p = new URLSearchParams(search);
    if (p.get("assistant") === "open") openAssistant();
    if (import.meta.env.DEV && p.get("mock") === "1" && p.get("demo") === "chat") void useAssistant.getState().loadConversation("conv-demo");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/Cmd+K opens the assistant (or focuses its composer when already visible).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      if (!onPage) openAssistant();
      requestAnimationFrame(() => document.getElementById("as-input")?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPage, openAssistant]);

  // Phones: the sheet is modal, so lock the page scroll behind it.
  useEffect(() => {
    if (!open || onPage || !compact) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, onPage, compact]);

  if (!open || onPage) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented) { e.stopPropagation(); closeAssistant(); }
  };
  const startResize = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => setPanelWidth(window.innerWidth - ev.clientX);
    const up = (ev: globalThis.PointerEvent) => {
      setPanelWidth(window.innerWidth - ev.clientX, true);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const resizeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    if (e.key === "ArrowLeft") { e.preventDefault(); setPanelWidth(panelWidth + step, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setPanelWidth(panelWidth - step, true); }
    else if (e.key === "Home") { e.preventDefault(); setPanelWidth(PANEL_MIN, true); }
    else if (e.key === "End") { e.preventDefault(); setPanelWidth(PANEL_MAX, true); }
  };
  const expand = () => { navigate(ASSISTANT_PATH, { state: { from: `${pathname}${search}` } }); };

  const body = (
    <aside ref={panel} className="assistant-panel" onKeyDown={onKeyDown}
      role={compact ? "dialog" : "complementary"} aria-modal={compact || undefined} aria-label="Asistente">
      {!compact && (
        <div className="assistant-resize" role="separator" aria-orientation="vertical" aria-label="Cambiar el ancho del asistente"
          aria-valuemin={PANEL_MIN} aria-valuemax={PANEL_MAX} aria-valuenow={panelWidth} tabIndex={0}
          onPointerDown={startResize} onKeyDown={resizeKey} onDoubleClick={() => setPanelWidth(420, true)} />
      )}
      <AssistantChat surface="panel" onClose={closeAssistant} onExpand={expand} autoFocus />
    </aside>
  );
  return compact ? createPortal(body, document.body) : body;
}
