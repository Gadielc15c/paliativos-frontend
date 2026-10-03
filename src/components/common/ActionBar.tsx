import type { ReactNode } from "react";
import clsx from "clsx";
import Button from "./Button";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { useIsCompact } from "./useMediaQuery";

export interface BarAction extends MenuAction {
  loading?: boolean;
}

interface ActionBarProps {
  /** The screen's main action: filled button, glows on hover/focus. */
  primary?: BarAction;
  /** Shown as gray buttons on desktop, folded into "Más" on phones. */
  secondary?: BarAction[];
  /** Max secondary buttons shown inline on desktop before folding the rest. */
  inlineLimit?: number;
  className?: string;
  children?: ReactNode;
  label?: string;
}

export default function ActionBar({ primary, secondary = [], inlineLimit = 3, className, children, label = "Acciones" }: ActionBarProps) {
  const isCompact = useIsCompact();
  const inline = isCompact ? [] : secondary.slice(0, inlineLimit);
  const folded = isCompact ? secondary : secondary.slice(inlineLimit);

  return (
    <div className={clsx("action-bar", className)} role="group" aria-label={label}>
      {primary && (
        <Button
          variant="primary"
          className="action-bar-primary glow-border"
          onClick={primary.onClick}
          disabled={primary.disabled}
          isLoading={primary.loading}
          title={primary.title}
        >
          {primary.icon}
          <span>{primary.label}</span>
        </Button>
      )}
      {inline.map((action) => (
        <Button
          key={action.id ?? action.label}
          variant={action.destructive ? "destructive" : "gray"}
          onClick={action.onClick}
          disabled={action.disabled}
          isLoading={action.loading}
          title={action.title}
        >
          {action.icon}
          <span>{action.label}</span>
        </Button>
      ))}
      {children}
      {folded.length > 0 && <ActionMenu actions={folded} text={isCompact ? "Más" : undefined} label="Más acciones" />}
    </div>
  );
}
