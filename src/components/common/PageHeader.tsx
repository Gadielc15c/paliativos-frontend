import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Primary action (and its siblings). Sits right after the title on phones. */
  actions?: ReactNode;
  /** Filters / search. Always after the actions, before content. */
  filters?: ReactNode;
  /** iOS-style back link shown above the title. */
  back?: { label: string; onClick: () => void };
  className?: string;
}

/** Fixed reading order on every screen: title → primary action → filters → content. */
export default function PageHeader({ title, eyebrow, description, actions, filters, back, className }: PageHeaderProps) {
  return (
    <header className={clsx("page-header", className)}>
      {back && (
        <button type="button" className="page-header-back" onClick={back.onClick}>
          <ChevronLeft size={20} aria-hidden="true" />
          <span>{back.label}</span>
        </button>
      )}
      <div className="page-header-row">
        <div className="page-header-copy">
          {eyebrow && <span className="page-header-eyebrow">{eyebrow}</span>}
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-description">{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {filters && <div className="page-header-filters">{filters}</div>}
    </header>
  );
}
