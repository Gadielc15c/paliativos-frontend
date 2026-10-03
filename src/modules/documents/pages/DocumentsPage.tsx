import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, UploadCloud } from "lucide-react";
import DataList from "../../../components/common/DataList";
import PageHeader from "../../../components/common/PageHeader";
import Pill from "../../../components/common/Pill";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import { Error as ErrorState, Loading } from "../../../components/states/StateContainers";
import { documentsEndpoints, patientsEndpoints } from "../../../services/endpoints";
import type { DocumentExtractionResultRecord, DocumentRecord } from "../../../types/api";
import type { ApiError } from "../../../types/common";
import { formatDateTime } from "../../../utils/format";
import { label } from "../../../utils/labels";
import ExtractionValidationModal from "../components/ExtractionValidationModal";
import "./DocumentsPage.css";

type BackendPrediction = "FACTURA" | "HOJA_ADMISION" | "UNKNOWN" | "UNSUPPORTED";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getStatusVariant = (
  value: string | null | undefined
): "success" | "warning" | "danger" | "info" | "neutral" => {
  if (!value) return "neutral";
  if (["approved", "applied", "ready", "classified", "validated"].includes(value)) {
    return "success";
  }
  if (["manual_review", "pending", "uploaded", "extracted"].includes(value)) {
    return "warning";
  }
  if (["failed", "rejected"].includes(value)) return "danger";
  return "info";
};

const validateSelectedFile = (selectedFile: File | null): string | null => {
  if (!selectedFile) return "Selecciona un archivo para continuar.";
  if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
    return "Formato no permitido. Usa PDF, JPG o PNG.";
  }
  if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
    return `El archivo supera el tamaño máximo de ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdFromRoute = searchParams.get("patientId");

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientIdFromRoute);
  const [autoHumanSupport, setAutoHumanSupport] = useState(true);
  const [supportNote, setSupportNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingBackend, setIsWaitingBackend] = useState(false);
  const [validationModal, setValidationModal] = useState<{
    document: DocumentRecord;
    extractionResult: DocumentExtractionResultRecord;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: patientsPage,
    isLoading: patientsLoading,
    isError: patientsError,
    refetch: refetchPatients,
  } = useQuery({
    queryKey: ["documents-patients"],
    queryFn: () => patientsEndpoints.list(1, 100),
  });

  const {
    data: documentsPage,
    isLoading: documentsLoading,
    isError: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents-list-simple", patientIdFromRoute],
    queryFn: () => documentsEndpoints.list(1, 50),
  });

  const patients = patientsPage?.items || [];

  const filteredPatients = useMemo(() => {
    const source = patientSearch.trim().toLowerCase();
    if (!source) return patients.slice(0, 4);
    return patients
      .filter(
        (patient) =>
          patient.full_name.toLowerCase().includes(source) ||
          patient.document_number.toLowerCase().includes(source)
      )
      .slice(0, 4);
  }, [patientSearch, patients]);

  const patientMap = useMemo(
    () => Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name])),
    [patients]
  );

  const visibleDocuments = useMemo(() => {
    const items = documentsPage?.items || [];
    if (!patientIdFromRoute) return items;
    return items.filter(
      (document) =>
        document.patient_id === patientIdFromRoute ||
        document.matched_patient_id === patientIdFromRoute
    );
  }, [documentsPage, patientIdFromRoute]);
  const recentDocuments = visibleDocuments.slice(0, 5);

  useEffect(() => {
    setSelectedPatientId(patientIdFromRoute);
  }, [patientIdFromRoute]);

  const handleOpenValidationModal = async (doc: DocumentRecord) => {
    try {
      const resultsPage = await documentsEndpoints.listExtractionResults(doc.id, 1, 1);
      const result = resultsPage.items[0];
      if (result) {
        setValidationModal({ document: doc, extractionResult: result });
      } else {
        toast.info("Este documento todavía no tiene una extracción disponible.");
      }
    } catch {
      toast.error("No se pudo cargar la extracción del documento.");
    }
  };

  const setSelectedFile = (nextFile: File | null) => {
    const validationError = validateSelectedFile(nextFile);
    setFile(nextFile);
    setFileError(validationError);
  };

  const waitForBackgroundPatientLink = async (documentId: string) => {
    const startedAt = Date.now();
    const timeoutMs = 90000;
    let intervalMs = 1500;
    while (Date.now() - startedAt < timeoutMs) {
      const current = await documentsEndpoints.getMeta(documentId);
      const trace = (current.metadata?.llm_patient_extraction || {}) as Record<string, unknown>;
      const status = String(trace.status || "");
      const linkedPatientId = current.patient_id || current.matched_patient_id || null;
      if (linkedPatientId) {
        return { patientId: linkedPatientId, traceStatus: status || "linked" };
      }
      if (["created_new", "matched_existing", "skipped", "error"].includes(status)) {
        return { patientId: null, traceStatus: status };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      intervalMs = Math.min(intervalMs + 500, 5000);
    }
    return { patientId: null, traceStatus: "timeout" };
  };

  const requestHumanSupport = async (
    documentId: string,
    reason: string,
    existingMetadata: Record<string, unknown> | null | undefined
  ) => {
    const nowIso = new Date().toISOString();
    await documentsEndpoints.update(documentId, {
      review_status: "manual_review",
      metadata: {
        ...(existingMetadata || {}),
        human_support: {
          status: "requested",
          reason,
          note: supportNote.trim() || null,
          requested_at: nowIso,
        },
      },
    });
  };

  const handleProcess = async () => {
    const validationError = validateSelectedFile(file);
    if (validationError) {
      setFileError(validationError);
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId = selectedPatientId || patientIdFromRoute || null;

      const uploaded = await documentsEndpoints.upload({
        file: file!,
        title: file!.name.replace(/\.[^/.]+$/, ""),
        patient_id: patientId || undefined,
        auto_extract_patient: true,
        extract_patient_in_background: !patientId,
      });

      if (!patientId) {
        setIsWaitingBackend(true);

        const waited = await waitForBackgroundPatientLink(uploaded.id);
        setIsWaitingBackend(false);
        if (waited.patientId) {
          patientId = waited.patientId;
        }
      }

      const processed = await documentsEndpoints.process(uploaded.id, {
        matched_patient_id: patientId || undefined,
      });
      const predicted = (processed.predicted_document_type_code || "UNKNOWN") as BackendPrediction;

      await refetchDocuments();
      await refetchPatients();
      if (patientId) {
        setSelectedPatientId(patientId);
      }

      if (!patientId && autoHumanSupport) {
        await requestHumanSupport(
          processed.id,
          "patient_link_not_resolved_after_polling",
          processed.metadata || null
        );
        await refetchDocuments();
      }

      if (["UNKNOWN", "UNSUPPORTED"].includes(predicted) && autoHumanSupport) {
        await requestHumanSupport(
          processed.id,
          `unsupported_prediction_${predicted.toLowerCase()}`,
          processed.metadata || null
        );
        await refetchDocuments();
        toast.info(
          "Documento recibido. Quedó pendiente de revisión humana para completar clasificación/asociación."
        );
        return;
      }

      toast.success(`Documento subido y procesado (${predicted}).`);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || "No se pudo subir el documento.");
    } finally {
      setIsWaitingBackend(false);
      setIsSubmitting(false);
    }
  };

  if (patientsLoading || documentsLoading) {
    return <Loading />;
  }

  const docsNeedingReview = recentDocuments.filter(
    (d) => d.review_required && d.review_status === "manual_review"
  );

  if (patientsError || documentsError) {
    return (
      <ErrorState
        message="No se pudo cargar el módulo documental."
        onRetry={() => {
          void Promise.all([refetchPatients(), refetchDocuments()]);
        }}
      />
    );
  }

  const patientName = (d: DocumentRecord) =>
    patientMap[d.patient_id || ""] || patientMap[d.matched_patient_id || ""] || "Sin paciente";

  return (
    <div className="data-screen documents-page-simple">
      {validationModal && (
        <ExtractionValidationModal
          document={validationModal.document}
          extractionResult={validationModal.extractionResult}
          onClose={() => setValidationModal(null)}
        />
      )}

      <PageHeader
        back={{ label: "Administración", onClick: () => navigate("/admin") }}
        eyebrow="Documentos"
        title="Subir documento"
        description="Elige el paciente (opcional), adjunta el archivo y súbelo. La IA lo clasifica y extrae los datos."
        filters={
          patientIdFromRoute ? (
            <Pill tone="info">Paciente: {patientMap[patientIdFromRoute] || patientIdFromRoute}</Pill>
          ) : undefined
        }
      />

      {docsNeedingReview.length > 0 && (
        <section className="docs-review-banner glow-border" data-tone="ai" aria-live="polite">
          <Sparkles size={18} aria-hidden="true" />
          <span className="docs-review-banner-text">
            {docsNeedingReview.length === 1
              ? "1 documento requiere revisión de extracción IA"
              : `${docsNeedingReview.length} documentos requieren revisión de extracción IA`}
          </span>
          <button
            type="button"
            className="docs-review-banner-btn"
            onClick={() => void handleOpenValidationModal(docsNeedingReview[0])}
          >
            Revisar
          </button>
        </section>
      )}


      <section className="data-split docs-main-grid" aria-label="Nuevo documento">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title"><span className="docs-step">1</span>Paciente</h2>
              <p className="data-card-subtitle">Opcional · se asocia automáticamente si lo omites</p>
            </div>
          </header>
          <div className="data-card-body docs-simple-body">
            <Input
              label="Buscar paciente"
              placeholder="Nombre, cédula o expediente"
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
            />

            <div className="docs-simple-patient-list">
              {filteredPatients.length === 0 ? (
                <p className="docs-simple-muted">Sin coincidencias.</p>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    className={`docs-simple-patient ${(selectedPatientId || patientIdFromRoute) === patient.id ? "selected" : ""}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                    type="button"
                  >
                    <strong>{patient.full_name}</strong>
                    <span>{patient.document_number}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title"><span className="docs-step">2</span>Archivo</h2>
              <p className="data-card-subtitle">PDF, JPG o PNG. Máx. {MAX_FILE_SIZE_MB} MB.</p>
            </div>
          </header>
          <div className="data-card-body docs-simple-body">
            <input
              ref={fileInputRef}
              className="docs-hidden-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />

            <button
              type="button"
              className={`docs-dropzone ${isDragActive ? "active" : ""} ${fileError ? "error" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
                const droppedFile = event.dataTransfer.files?.[0] || null;
                setSelectedFile(droppedFile);
              }}
            >
              <UploadCloud size={28} aria-hidden="true" />
              <strong>{file ? file.name : "Arrastra archivo o haz clic para seleccionar"}</strong>
              <span>PDF, JPG, PNG</span>
            </button>

            {file && !fileError && (
              <p className="docs-simple-file-meta">Archivo listo para subir.</p>
            )}
            {fileError && <p className="docs-simple-feedback error">{fileError}</p>}

            <label className="docs-simple-label" htmlFor="support-note">
              Comentario interno opcional
            </label>
            <textarea
              id="support-note"
              className="docs-simple-textarea"
              rows={3}
              placeholder="Ejemplo: el nombre del paciente está incompleto en el documento."
              value={supportNote}
              onChange={(event) => setSupportNote(event.target.value)}
            />

            <label className="docs-simple-check">
              <input
                type="checkbox"
                checked={autoHumanSupport}
                onChange={(event) => setAutoHumanSupport(event.target.checked)}
              />
              Enviar a revisión humana si no se puede asociar automáticamente
            </label>

            <div className="form-actions docs-submit">
              <Button variant="primary" className="glow-border" onClick={() => void handleProcess()} isLoading={isSubmitting}>
                <UploadCloud size={18} aria-hidden="true" />
                <span>Subir documento</span>
              </Button>
            </div>

            {isWaitingBackend && (
              <div className="docs-simple-waiting" role="status" aria-live="polite">
                <span className="docs-simple-waiting-text">Identificando paciente</span>
                <span className="docs-simple-waiting-dots">
                  ...
                </span>
              </div>
            )}
          </div>
        </article>
      </section>

      {recentDocuments.length > 0 && (
        <section className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Recientes</h2>
              <p className="data-card-subtitle">{recentDocuments.length} documentos</p>
            </div>
          </header>
          <div className="data-card-body">
            <DataList
              label="Documentos recientes"
              rows={recentDocuments}
              rowKey={(d) => d.id}
              title={(d) => d.title}
              subtitle={(d) => `${patientName(d)} · ${formatDateTime(d.created_at)}`}
              status={(d) => <Pill tone={getStatusVariant(d.review_status)}>{label("documentReview", d.review_status)}</Pill>}
              detail={(d) => (
                <span className="docs-card-pills">
                  <Pill tone="neutral">{d.predicted_document_type_code ? label("documentType", d.predicted_document_type_code) : "Sin tipo"}</Pill>
                  <Pill tone={getStatusVariant(d.processing_status)}>{label("documentProcessing", d.processing_status)}</Pill>
                </span>
              )}
              actions={(d) =>
                d.review_required && d.review_status === "manual_review"
                  ? [{ label: "Revisar", title: "Revisar extracción IA", icon: <Sparkles size={16} aria-hidden="true" />, onClick: () => void handleOpenValidationModal(d) }]
                  : []
              }
              columns={[
                { key: "title", header: "Documento", cell: (d) => <span className="docs-cell-title">{d.title}</span>, width: "28%" },
                { key: "patient", header: "Paciente", cell: (d) => patientName(d) },
                { key: "type", header: "Tipo", cell: (d) => <Pill tone="neutral">{d.predicted_document_type_code ? label("documentType", d.predicted_document_type_code) : "Sin tipo"}</Pill> },
                { key: "process", header: "Proceso", cell: (d) => <Pill tone={getStatusVariant(d.processing_status)}>{label("documentProcessing", d.processing_status)}</Pill> },
                { key: "review", header: "Revisión", cell: (d) => <Pill tone={getStatusVariant(d.review_status)}>{label("documentReview", d.review_status)}</Pill> },
                { key: "date", header: "Fecha", cell: (d) => formatDateTime(d.created_at), numeric: true },
              ]}
            />
          </div>
        </section>
      )}
    </div>
  );
}
