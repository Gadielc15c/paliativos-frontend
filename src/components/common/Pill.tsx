import type { MouseEventHandler, ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import "./Badge.css";

export type PillTone = "neutral" | "success" | "warning" | "danger" | "info" | "ai";
type PillBaseProps = {
  children: ReactNode;
  tone?: PillTone;
  size?: "sm" | "md";
  className?: string;
  /** Compatibility with Badge. Prefer tone. */
  variant?: Exclude<PillTone, "danger" | "ai"> | "error";
} & ({ removable: true; onRemove: () => void; removeLabel?: string } |
  { removable?: false; onRemove?: never; removeLabel?: never });
export type PillProps = PillBaseProps & (
  { selected: boolean; onClick: MouseEventHandler<HTMLButtonElement>; disabled?: boolean } |
  { selected?: never; onClick?: never; disabled?: never }
);
export default function Pill({ children, tone, variant, size = "sm", className,
  removable, onRemove, removeLabel, selected, onClick, disabled }: PillProps) {
  const resolvedTone = tone ?? (variant === "error" ? "danger" : variant) ?? "neutral";
  const content = <span className="pill-label" title={typeof children === "string" || typeof children === "number" ? String(children) : undefined}>{children}</span>;
  return (
    <span className={clsx("pill", resolvedTone === "ai" && "glow-border", className)} data-tone={resolvedTone} data-size={size}
      data-selected={selected} data-interactive={selected !== undefined || removable || undefined}>
      {selected !== undefined ? (
        <button type="button" className="pill-filter" aria-pressed={selected}
          onClick={onClick} disabled={disabled}>{content}</button>
      ) : content}
      {removable && (
        <button type="button" className="pill-remove" disabled={disabled}
          aria-label={removeLabel ?? (typeof children === "string" ? `Quitar ${children}` : "Quitar etiqueta")}
          onClick={(event) => { event.stopPropagation(); onRemove(); }}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
export { Pill, Pill as Tag, Pill as Badge };
