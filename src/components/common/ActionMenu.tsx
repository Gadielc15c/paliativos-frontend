import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import { useIsCompact } from "./useMediaQuery";
import "./ActionMenu.css";

export interface MenuAction {
  id?: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  title?: string;
}

interface ActionMenuProps {
  actions: MenuAction[];
  /** Accessible name and sheet title. */
  label?: string;
  /** Visible text next to the ellipsis (e.g. "Más"). Icon-only when omitted. */
  text?: string;
  className?: string;
  /** Replaces the ellipsis glyph (e.g. a chevron for filter pills). */
  icon?: ReactNode;
}

/**
 * Overflow menu. Popover anchored to the trigger on desktop, an iOS-style
 * action sheet (bottom, safe-area aware) on phones.
 */
export default function ActionMenu({ actions, label = "Más acciones", text, className, icon }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isCompact = useIsCompact();
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || isCompact || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const estimated = actions.length * 52 + 24;
    setPos({
      top: spaceBelow > estimated ? r.bottom + 8 : Math.max(16, r.top - estimated - 8),
      right: Math.max(16, window.innerWidth - r.right),
    });
  }, [open, isCompact, actions.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!actions.length) return null;

  const run = (action: MenuAction) => {
    setOpen(false);
    action.onClick();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={clsx("action-menu-trigger", text && "has-text", className)}
        aria-label={text ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        {icon ?? <MoreHorizontal size={18} aria-hidden="true" />}
        {text && <span>{text}</span>}
      </button>
      {open && createPortal(
        <div className={clsx("action-menu-layer", isCompact ? "is-sheet" : "is-popover")} onClick={() => setOpen(false)}>
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            className="action-menu-panel"
            style={!isCompact && pos ? { top: pos.top, right: pos.right } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {isCompact && <p className="action-menu-title">{label}</p>}
            <div className="action-menu-group">
              {actions.map((action) => (
                <button
                  key={action.id ?? action.label}
                  type="button"
                  role="menuitem"
                  className={clsx("action-menu-item", action.destructive && "is-destructive")}
                  disabled={action.disabled}
                  title={action.title}
                  onClick={() => run(action)}
                >
                  {action.icon && <span className="action-menu-icon" aria-hidden="true">{action.icon}</span>}
                  <span className="action-menu-label">{action.label}</span>
                </button>
              ))}
            </div>
            {isCompact && (
              <button type="button" className="action-menu-cancel" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
