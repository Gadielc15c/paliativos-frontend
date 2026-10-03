import clsx from "clsx";
import { X } from "lucide-react";

interface CodePillProps {
  code: string;
  description?: string;
  primary?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

/** CIE-10 code in monospace + its description. Removable when onRemove is given. */
export default function CodePill({ code, description, primary, onRemove, onClick, className }: CodePillProps) {
  const body = (
    <>
      <span className="code-chip-code">{code}</span>
      {description && <span className="code-chip-desc" title={description}>{description}</span>}
      {primary && <span className="code-pill-flag">Principal</span>}
    </>
  );
  return (
    <span className={clsx("code-chip", primary && "is-primary", (onRemove || onClick) && "is-interactive", className)}>
      {onClick ? <button type="button" className="code-chip-main" onClick={onClick}>{body}</button> : <span className="code-chip-main">{body}</span>}
      {onRemove && (
        <button type="button" className="code-chip-remove" onClick={onRemove} aria-label={`Quitar ${code}`}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
