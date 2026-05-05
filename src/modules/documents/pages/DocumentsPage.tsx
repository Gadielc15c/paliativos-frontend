import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { UploadCloud } from "lucide-react";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import { Error as ErrorState, Loading } from "../../../components/states/StateContainers";
import { documentsEndpoints, patientsEndpoints } from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import { formatDateTime } from "../../../utils/format";
import "./DocumentsPage.css";

type BackendPrediction = "FACTURA" | "HOJA_ADMISION" | "UNKNOWN" | "UNSUPPORTED";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getStatusVariant = (
  value: string | null | undefined
): "success" | "warning" | "error" | "info" | "neutral" => {
  if (!value) return "neutral";
  if (["approved", "applied", "ready", "classified", "validated"].includes(value)) {
    return "success";
  }
  if (["manual_review", "pending", "uploaded", "extracted"].includes(value)) {
    return "warning";
  }
  if (["failed", "rejected"].includes(value)) return "error";
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const waitingDotsRef = useRef<HTMLSpanElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll(".data-card, .data-screen-header");
    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: "power2.out",
      }
    );
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (!isWaitingBackend || !waitingDotsRef.current) return;
    const tween = gsap.to(waitingDotsRef.current, {
      opacity: 0.2,
      duration: 0.55,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
    return () => {
      tween.kill();
      gsap.set(waitingDotsRef.current, { opacity: 1 });
    };
  }, [isWaitingBackend]);

  const setSelectedFile = (nextFile: File | null) => {
    const validationError = validateSelectedFile(nextFile);
    setFile(nextFile);
    setFileError(validationError);
    if (!validationError) {
      setFeedbackError(null);
    }
  };

  const waitForBackgroundPatientLink = async (documentId: string) => {
    const startedAt = Date.now();
    const timeoutMs = 90000;
    let intervalMs = 1500;
    while (Date.now() - startedAt < timeoutMs) {
      const current = await documentsEndpoints.get(documentId);
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
      setFeedbackError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setFeedbackError(null);

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
        setFeedback(
          "Documento recibido. Quedó pendiente de revisión humana para completar clasificación/asociación."
        );
        return;
      }

      setFeedback(`Documento subido y procesado (${predicted}).`);
    } catch (error) {
      const apiError = error as ApiError;
      setFeedbackError(apiError.message || "No se pudo subir el documento.");
    } finally {
      setIsWaitingBackend(false);
      setIsSubmitting(false);
    }
  };

  if (patientsLoading || documentsLoading) {
    return <Loading />;
  }

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

  return (
    <div className="data-screen documents-page-simple" ref={cardsRef}>
      <section className="data-screen-header docs-header-compact">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Documentos</span>
          <h1>Subir documento del paciente</h1>
          <p className="data-screen-description">
            Selecciona paciente (opcional), sube archivo y listo.
          </p>
          {patientIdFromRoute && (
            <p className="data-screen-description">
              Paciente activo: <strong>{patientMap[patientIdFromRoute] || patientIdFromRoute}</strong>
            </p>
          )}
        </div>
      </section>

      <section className="data-split docs-main-grid">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Paciente</h2>
              <p className="data-card-subtitle">Opcional</p>
            </div>
          </header>
          <div className="data-card-body docs-simple-body">
            <Input
              label="Buscar paciente"
              placeholder="Buscar por nombre, cédula o expediente"
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
              <h2 className="data-card-title">Archivo</h2>
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
              <UploadCloud size={22} />
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

            <Button variant="primary" onClick={() => void handleProcess()} isLoading={isSubmitting}>
              Subir documento
            </Button>

            {isWaitingBackend && (
              <div className="docs-simple-waiting" role="status" aria-live="polite">
                <span className="docs-simple-waiting-text">Identificando paciente</span>
                <span ref={waitingDotsRef} className="docs-simple-waiting-dots">
                  ...
                </span>
              </div>
            )}

            {feedback && <p className="docs-simple-feedback success">{feedback}</p>}
            {feedbackError && <p className="docs-simple-feedback error">{feedbackError}</p>}
          </div>
        </article>
      </section>

      {recentDocuments.length > 0 && (
        <section className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Recientes</h2>
            </div>
          </header>
          <div className="data-card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Paciente</th>
                  <th>Proceso</th>
                  <th>Revisión</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.title}</td>
                    <td>
                      <Badge variant={getStatusVariant(document.processing_status)}>
                        {document.predicted_document_type_code || "-"}
                      </Badge>
                    </td>
                    <td>
                      {patientMap[document.patient_id || ""] ||
                        patientMap[document.matched_patient_id || ""] ||
                        "Sin paciente"}
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(document.processing_status)}>
                        {document.processing_status}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(document.review_status)}>
                        {document.review_status}
                      </Badge>
                    </td>
                    <td>{formatDateTime(document.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
