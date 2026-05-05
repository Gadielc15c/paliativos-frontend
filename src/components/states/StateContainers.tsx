import { Loader, Package, AlertTriangle, Lock, Wifi, CheckCircle } from "lucide-react";
import "./StateContainers.css";

export function Loading() {
  return (
    <div className="state-container">
      <Loader size={32} className="state-spinner" />
      <p className="state-text">Cargando...</p>
    </div>
  );
}

export function Empty({ message = "Sin registros disponibles" }: { message?: string }) {
  return (
    <div className="state-container">
      <Package size={32} className="state-icon empty" />
      <p className="state-text">{message}</p>
    </div>
  );
}

export function Error({ message = "Error en la operación", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="state-container">
      <AlertTriangle size={32} className="state-icon error" />
      <p className="state-text">{message}</p>
      {onRetry && (
        <button className="state-retry-button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Unauthorized() {
  return (
    <div className="state-container">
      <Lock size={32} className="state-icon unauthorized" />
      <p className="state-text">No tienes permiso para acceder a esta sección</p>
    </div>
  );
}

export function Unavailable() {
  return (
    <div className="state-container">
      <Wifi size={32} className="state-icon unavailable" />
      <p className="state-text">Servicio no disponible. Intenta más tarde.</p>
    </div>
  );
}

export function Success({ message = "Operación exitosa" }: { message?: string }) {
  return (
    <div className="state-container">
      <CheckCircle size={32} className="state-icon success" />
      <p className="state-text">{message}</p>
    </div>
  );
}
