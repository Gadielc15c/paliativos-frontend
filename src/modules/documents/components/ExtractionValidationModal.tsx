import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import { documentsEndpoints } from "../../../services/endpoints";
import type { DocumentExtractionResultRecord, DocumentRecord } from "../../../types/api";
import type { ApiError } from "../../../types/common";
import "./ExtractionValidationModal.css";

interface ExtractionValidationModalProps {
  document: DocumentRecord;
  extractionResult: DocumentExtractionResultRecord;
  onClose: () => void;
}

const getConfidenceClass = (confidence: number | undefined): string => {
  if (confidence === undefined) return "";
  if (confidence < 0.6) return "confidence-low";
  if (confidence < 0.8) return "confidence-medium";
  return "confidence-high";
};

const getConfidenceLabel = (confidence: number | undefined): string => {
  if (confidence === undefined) return "";
  if (confidence < 0.6) return `Baja (${Math.round(confidence * 100)}%)`;
  if (confidence < 0.8) return `Media (${Math.round(confidence * 100)}%)`;
  return `Alta (${Math.round(confidence * 100)}%)`;
};

export default function ExtractionValidationModal({
  document,
  extractionResult,
  onClose,
}: ExtractionValidationModalProps) {
  const queryClient = useQueryClient();
  const [editedPayload, setEditedPayload] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(extractionResult.extracted_payload).map(([k, v]) => [k, String(v ?? "")])
    )
  );
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      await documentsEndpoints.validateExtraction(document.id, {
        extraction_result_id: extractionResult.id,
        validated_payload: editedPayload,
        per_field_confidence: extractionResult.per_field_confidence,
      });
      await queryClient.invalidateQueries({ queryKey: ["documents-list-simple"] });
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "No se pudo validar extracción.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    setError(null);
    try {
      await documentsEndpoints.reject(document.id, { reason: rejectReason.trim() });
      await queryClient.invalidateQueries({ queryKey: ["documents-list-simple"] });
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "No se pudo rechazar documento.");
    } finally {
      setIsRejecting(false);
    }
  };

  const fields = Object.keys(extractionResult.extracted_payload);

  return (
    <div className="extraction-modal-overlay" role="dialog" aria-modal="true" aria-label="Validar extracción IA">
      <div className="extraction-modal">
        <div className="extraction-modal-header">
          <div>
            <h2 className="extraction-modal-title">Validar extracción IA</h2>
            <p className="extraction-modal-subtitle">{document.title}</p>
          </div>
          <button className="extraction-modal-close" onClick={onClose} type="button" aria-label="Cerrar">✕</button>
        </div>

        {extractionResult.confidence !== null && (
          <div className={`extraction-modal-confidence-banner ${getConfidenceClass(extractionResult.confidence ?? undefined)}`}>
            Confianza general: {getConfidenceLabel(extractionResult.confidence ?? undefined)}
          </div>
        )}

        <div className="extraction-modal-body">
          <p className="extraction-modal-instruction">
            Revisa y corrige los campos extraídos por IA. Los campos marcados en rojo tienen baja confianza.
          </p>

          <div className="extraction-modal-fields">
            {fields.length === 0 ? (
              <p className="extraction-modal-empty">Sin campos extraídos.</p>
            ) : (
              fields.map((field) => {
                const conf = extractionResult.per_field_confidence?.[field];
                return (
                  <div key={field} className={`extraction-modal-field ${getConfidenceClass(conf)}`}>
                    <label className="extraction-modal-field-label">
                      <span className="extraction-modal-field-name">{field}</span>
                      {conf !== undefined && (
                        <span className={`extraction-modal-field-confidence ${getConfidenceClass(conf)}`}>
                          {getConfidenceLabel(conf)}
                        </span>
                      )}
                    </label>
                    <input
                      className="extraction-modal-field-input"
                      type="text"
                      value={editedPayload[field] ?? ""}
                      onChange={(e) =>
                        setEditedPayload((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="extraction-modal-error">{error}</p>}

        {showRejectForm ? (
          <div className="extraction-modal-reject-form">
            <label className="extraction-modal-field-label" htmlFor="reject-reason">
              Razón del rechazo
            </label>
            <textarea
              id="reject-reason"
              className="extraction-modal-reject-textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica por qué se rechaza este documento..."
            />
            <div className="extraction-modal-footer">
              <Button variant="secondary" onClick={() => setShowRejectForm(false)} disabled={isRejecting}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => void handleReject()} isLoading={isRejecting} disabled={!rejectReason.trim()}>
                Confirmar rechazo
              </Button>
            </div>
          </div>
        ) : (
          <div className="extraction-modal-footer">
            <Button variant="secondary" onClick={() => setShowRejectForm(true)} disabled={isConfirming}>
              Rechazar documento
            </Button>
            <Button variant="primary" onClick={() => void handleConfirm()} isLoading={isConfirming}>
              Confirmar extracción
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
