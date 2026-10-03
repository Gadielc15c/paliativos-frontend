import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import Button from "../common/Button";

/** Empty / error state that lives inside a card (the page-level ones are too tall for that). */
export default function InlineState({ kind = "empty", message, onRetry, children }: { kind?: "empty" | "error"; message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div className="inline-state" role={kind === "error" ? "alert" : undefined}>
      {kind === "error" ? <AlertTriangle size={24} aria-hidden="true" /> : <Inbox size={24} aria-hidden="true" />}
      <p>{message}</p>
      {onRetry && <Button variant="gray" onClick={onRetry}>Reintentar</Button>}
      {children}
    </div>
  );
}
