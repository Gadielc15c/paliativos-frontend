import type { ReactNode } from "react";
import { Loader, Inbox, AlertTriangle, Lock, Wifi, CheckCircle } from "lucide-react";
import "./StateContainers.css";

/** A next step for an empty/error state: a button, or any node (e.g. a Link). */
export type StateAction = { label: string; onClick: () => void; icon?: ReactNode } | ReactNode;

function ActionSlot({ action }: { action?: StateAction }) {
  if (!action) return null;
  if (typeof action === "object" && action !== null && "label" in action && "onClick" in action) {
    const a = action as { label: string; onClick: () => void; icon?: ReactNode };
    return <button type="button" className="state-retry-button" onClick={a.onClick}>{a.icon}{a.label}</button>;
  }
  return <>{action as ReactNode}</>;
}

export function Loading({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="state-container" role="status" aria-live="polite">
      <Loader size={32} className="state-spinner" aria-hidden="true" />
      <p className="state-text">{message}</p>
    </div>
  );
}

interface EmptyProps {
  /** What is (not) here, in plain words. */
  message?: string;
  /** Optional heading above the message. */
  title?: string;
  /** The next step: never leave someone looking at an empty panel. */
  action?: StateAction;
  /** Short hint under the message (e.g. where the data comes from). */
  hint?: string;
}

export function Empty({ message = "Todavía no hay nada aquí. Cuando se registre información aparecerá en esta sección.", title, action, hint }: EmptyProps) {
  return (
    <div className="state-container is-empty">
      <Inbox size={32} className="state-icon empty" aria-hidden="true" />
      {title && <h2 className="state-title">{title}</h2>}
      <p className="state-text">{message}</p>
      {hint && <p className="state-hint">{hint}</p>}
      <ActionSlot action={action} />
    </div>
  );
}

export function Error({ message = "No se pudo cargar esta sección.", onRetry, hint = "Revisa tu conexión a internet y vuelve a intentarlo.", action }: { message?: string; onRetry?: () => void; hint?: string; action?: StateAction }) {
  return (
    <div className="state-container" role="alert">
      <AlertTriangle size={32} className="state-icon error" aria-hidden="true" />
      <p className="state-text">{message}</p>
      {hint && <p className="state-hint">{hint}</p>}
      {onRetry && <button type="button" className="state-retry-button" onClick={onRetry}>Reintentar</button>}
      <ActionSlot action={action} />
    </div>
  );
}

export function Unauthorized({ message = "No tienes permiso para ver esta sección." }: { message?: string }) {
  return (
    <div className="state-container">
      <Lock size={32} className="state-icon unauthorized" aria-hidden="true" />
      <p className="state-text">{message}</p>
      <p className="state-hint">Si la necesitas para tu trabajo, pide acceso al administrador de la clínica.</p>
    </div>
  );
}

export function Unavailable() {
  return (
    <div className="state-container">
      <Wifi size={32} className="state-icon unavailable" aria-hidden="true" />
      <p className="state-text">El servicio no responde en este momento.</p>
      <p className="state-hint">Espera unos minutos y vuelve a intentarlo. Si sigue igual, avisa al administrador.</p>
    </div>
  );
}

export function Success({ message = "Listo. Los cambios se guardaron." }: { message?: string }) {
  return (
    <div className="state-container">
      <CheckCircle size={32} className="state-icon success" aria-hidden="true" />
      <p className="state-text">{message}</p>
    </div>
  );
}
