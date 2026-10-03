import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { X } from "lucide-react";
import "./Sheet.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Sticky footer (primary actions). */
  footer?: ReactNode;
  className?: string;
  size?: "md" | "lg";
}

/** Side sheet on desktop, bottom sheet (grabber, safe area) on phones. Escape and backdrop close it. */
export default function Sheet({ open, onClose, title, subtitle, children, footer, className, size = "md" }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-layer" onClick={onClose}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={clsx("sheet-panel", `sheet-${size}`, className)} onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" aria-hidden="true" />
        <header className="sheet-header">
          <div className="sheet-heading">
            <h2 id={titleId} className="sheet-title">{title}</h2>
            {subtitle && <p className="sheet-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
