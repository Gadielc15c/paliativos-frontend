import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Edit2, FileText, FolderOpen, Plus } from "lucide-react";
import { PatientList, PatientProfile } from "../components";
import { usePatients } from "../hooks";
import Button from "../../../components/common/Button";
import {
  billingEndpoints,
  episodesEndpoints,
  patientsEndpoints,
} from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import { useContextActions } from "../../../app/store/useContextActions";
import type { ContextAction } from "../../../app/store/useContextActions";
import { formatCurrency } from "../../../utils/format";
import "./PatientsPage.css";

export default function PatientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPatientId = searchParams.get("patientId");
  const initialFocusMode = searchParams.get("focus") === "1";
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientFocusMode, setPatientFocusMode] = useState(initialFocusMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAction, setActiveAction] = useState<"episode" | "invoice" | "update" | null>(
    null
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [episodeForm, setEpisodeForm] = useState({
    episode_type: "Seguimiento",
    diagnosis: "",
    notes: "",
    start_date: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    issue_date: "",
    insurer_name: "",
    item_description: "",
    item_quantity: "1",
    item_unit_price: "",
    notes: "",
  });
  const [notesDraft, setNotesDraft] = useState("");
  const profileColumnRef = useRef<HTMLDivElement | null>(null);

  const effectiveSelectedPatientId = selectedPatientId || initialPatientId;

  const {
    data: patients,
    isLoading: patientsLoading,
    isError: patientsError,
    refetch: refetchPatients,
  } = usePatients(1, 50, searchQuery);

  const {
    data: patientProfile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["patient-profile", effectiveSelectedPatientId],
    enabled: !!effectiveSelectedPatientId,
    queryFn: () => patientsEndpoints.getProfile(effectiveSelectedPatientId!),
    staleTime: 2 * 60 * 1000,
  });

  const selectedPatient = patientProfile?.patient ?? null;
  const patientLoading = profileLoading;
  const patientError = profileError;
  const refetchPatient = refetchProfile;
  const refetchWorkspace = refetchProfile;

  const patientAlerts = useMemo(() => {
    if (!selectedPatient) return [];

    const alerts: Array<{
      tone: "info" | "warning" | "error" | "success";
      message: string;
    }> = [];

    if (!selectedPatient.insurer_name) {
      alerts.push({
        tone: "warning",
        message: "Paciente sin aseguradora registrada. Conviene completar cobertura antes de facturar.",
      });
    }

    const balance = parseFloat(patientProfile?.financial.outstanding_balance || "0");
    if (balance > 0) {
      alerts.push({
        tone: "warning",
        message: `Saldo pendiente acumulado: ${balance.toFixed(2)}.`,
      });
    }

    if ((patientProfile?.active_conditions.length || 0) === 0) {
      alerts.push({
        tone: "info",
        message: "Todavía no hay historial médico estructurado para este paciente.",
      });
    }

    const pendingDocs = (patientProfile?.recent_documents || []).filter(
      (d) => d.application_status !== "applied"
    ).length;
    if (pendingDocs > 0) {
      alerts.push({
        tone: "info",
        message: "Hay documentos subidos que todavía no fueron aplicados al dominio.",
      });
    }

    return alerts;
  }, [patientProfile, selectedPatient]);

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setPatientFocusMode(true);
    const next = new URLSearchParams(searchParams);
    next.set("patientId", id);
    next.set("focus", "1");
    setSearchParams(next, { replace: true });
    setActionMessage(null);
    setActionError(null);
    setShowInvoiceForm(false);
    setShowNotesForm(false);
    setInvoiceForm({
      issue_date: "",
      insurer_name: "",
      item_description: "",
      item_quantity: "1",
      item_unit_price: "",
      notes: "",
    });
    setNotesDraft("");
    profileColumnRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleFocusMode = () => {
    const nextFocus = !patientFocusMode;
    setPatientFocusMode(nextFocus);
    const next = new URLSearchParams(searchParams);
    if (effectiveSelectedPatientId) {
      next.set("patientId", effectiveSelectedPatientId);
    }
    next.set("focus", nextFocus ? "1" : "0");
    setSearchParams(next, { replace: true });
  };

  const handleRegisterEpisode = () => {
    if (!effectiveSelectedPatientId) return;
    setShowEpisodeForm((v) => !v);
    setShowInvoiceForm(false);
    setShowNotesForm(false);
    setActionMessage(null);
    setActionError(null);
  };

  const handleSubmitEpisode = () => {
    if (!effectiveSelectedPatientId) return;

    const run = async () => {
      setActiveAction("episode");
      setActionMessage(null);
      setActionError(null);
      try {
        const episode = await episodesEndpoints.create({
          patient_id: effectiveSelectedPatientId,
          episode_type: episodeForm.episode_type.trim() || "Seguimiento",
          start_date: episodeForm.start_date
            ? new Date(episodeForm.start_date).toISOString()
            : new Date().toISOString(),
          diagnosis: episodeForm.diagnosis.trim() || null,
          notes: episodeForm.notes.trim() || null,
          status: "open",
        });
        setActionMessage(`Episodio creado: ${episode.id}`);
        setShowEpisodeForm(false);
        setEpisodeForm({ episode_type: "Seguimiento", diagnosis: "", notes: "", start_date: "" });
        await refetchWorkspace();
        navigate(`/episodes?patientId=${effectiveSelectedPatientId}&episodeId=${episode.id}`);
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo crear episodio.");
      } finally {
        setActiveAction(null);
      }
    };

    void run();
  };

  const handleCreateInvoice = () => {
    if (!effectiveSelectedPatientId) return;
    setShowInvoiceForm((v) => !v);
    setShowEpisodeForm(false);
    setShowNotesForm(false);
    setActionMessage(null);
    setActionError(null);
    setInvoiceForm((previous) => ({
      ...previous,
      insurer_name: previous.insurer_name || selectedPatient?.insurer_name || "",
    }));
  };

  const handleSubmitInvoice = () => {
    if (!effectiveSelectedPatientId) return;

    const quantity = Number(invoiceForm.item_quantity);
    const unitPrice = Number(invoiceForm.item_unit_price);
    const hasItem = invoiceForm.item_description.trim().length > 0;

    if (!invoiceForm.issue_date) {
      setActionError("Define la fecha de emisión de la factura.");
      return;
    }
    if (hasItem && (!Number.isFinite(quantity) || quantity <= 0)) {
      setActionError("La cantidad del item debe ser mayor a cero.");
      return;
    }
    if (hasItem && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
      setActionError("El precio unitario del item debe ser mayor a cero.");
      return;
    }

    const run = async () => {
      setActiveAction("invoice");
      setActionMessage(null);
      setActionError(null);
      try {
        const invoice = await billingEndpoints.createInvoice({
          patient_id: effectiveSelectedPatientId,
          date: new Date(`${invoiceForm.issue_date}T00:00:00`).toISOString(),
          insurer_name: invoiceForm.insurer_name.trim() || selectedPatient?.insurer_name || null,
          notes: invoiceForm.notes.trim() || null,
          items: hasItem
            ? [
                {
                  description: invoiceForm.item_description.trim(),
                  quantity,
                  unit_price: unitPrice,
                },
              ]
            : undefined,
        });
        setActionMessage(`Factura creada: ${invoice.invoice_number}`);
        setShowInvoiceForm(false);
        setInvoiceForm({
          issue_date: "",
          insurer_name: selectedPatient?.insurer_name || "",
          item_description: "",
          item_quantity: "1",
          item_unit_price: "",
          notes: "",
        });
        await refetchWorkspace();
        navigate(`/billing?patientId=${effectiveSelectedPatientId}&invoiceId=${invoice.id}`);
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo crear factura.");
      } finally {
        setActiveAction(null);
      }
    };

    void run();
  };

  const handleUpdateData = () => {
    if (!effectiveSelectedPatientId || !selectedPatient) return;
    setShowNotesForm((v) => !v);
    setShowEpisodeForm(false);
    setShowInvoiceForm(false);
    setActionMessage(null);
    setActionError(null);
    setNotesDraft(selectedPatient.notes || "");
  };

  const handleSubmitNotes = () => {
    if (!effectiveSelectedPatientId) return;

    const run = async () => {
      setActiveAction("update");
      setActionMessage(null);
      setActionError(null);
      try {
        await patientsEndpoints.update(effectiveSelectedPatientId, {
          notes: notesDraft.trim() || null,
        });
        await Promise.all([refetchPatient(), refetchPatients()]);
        setShowNotesForm(false);
        setActionMessage(`Notas del paciente ${effectiveSelectedPatientId} actualizadas.`);
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo actualizar notas.");
      } finally {
        setActiveAction(null);
      }
    };

    void run();
  };

  const handleOpenBilling = () => {
    if (!effectiveSelectedPatientId) return;
    navigate(`/billing?patientId=${effectiveSelectedPatientId}`);
  };

  const handleOpenDocuments = () => {
    if (!effectiveSelectedPatientId) return;
    navigate(`/documents?patientId=${effectiveSelectedPatientId}`);
  };

  const contextualActions: ContextAction[] = [
    {
      id: "register-episode",
      label: "Registrar episodio",
      icon: <Plus size={14} />,
      onClick: handleRegisterEpisode,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "episode",
      title: "Registrar un nuevo episodio clínico",
    },
    {
      id: "create-invoice",
      label: "Emitir factura",
      icon: <FileText size={14} />,
      onClick: handleCreateInvoice,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "invoice",
      title: "Emitir nueva factura",
    },
    {
      id: "open-billing",
      label: "Ver facturación",
      icon: <FileText size={14} />,
      onClick: handleOpenBilling,
      disabled: !effectiveSelectedPatientId,
      title: "Abrir facturación filtrada por paciente",
    },
    {
      id: "open-documents",
      label: "Ver documentos",
      icon: <FolderOpen size={14} />,
      onClick: handleOpenDocuments,
      disabled: !effectiveSelectedPatientId,
      title: "Ir al módulo documental",
    },
    {
      id: "update-data",
      label: "Actualizar notas",
      icon: <Edit2 size={14} />,
      onClick: handleUpdateData,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "update",
      title: "Actualizar información del paciente",
    },
  ];

  const setContextActions = useContextActions((state) => state.setContextActions);
  const setContextFeedback = useContextActions((state) => state.setContextFeedback);
  const setContextSummary = useContextActions((state) => state.setContextSummary);
  const setContextAlerts = useContextActions((state) => state.setContextAlerts);
  const clearContextActions = useContextActions((state) => state.clearContextActions);

  useEffect(() => {
    setContextActions(contextualActions);
    return () => clearContextActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedPatientId, selectedPatient, activeAction]);

  useEffect(() => {
    setContextFeedback({ message: actionMessage, error: actionError });
  }, [actionMessage, actionError, setContextFeedback]);

  useEffect(() => {
    if (!selectedPatient) {
      setContextSummary(null, []);
      return;
    }
    const financial = patientProfile?.financial;
    setContextSummary("Resumen rápido", [
      { label: "Paciente", value: selectedPatient.full_name || "Sin selección" },
      { label: "Aseguradora", value: selectedPatient.insurer_name || "Sin registro" },
      { label: "Balance", value: formatCurrency(parseFloat(financial?.outstanding_balance || "0")) },
      { label: "Documentos", value: String(patientProfile?.recent_documents.length || 0) },
      { label: "Condiciones activas", value: String(patientProfile?.active_conditions.length || 0) },
      { label: "Prescripciones activas", value: String(patientProfile?.active_prescriptions.length || 0) },
    ]);
  }, [selectedPatient, patientProfile, setContextSummary]);

  useEffect(() => {
    setContextAlerts(patientAlerts);
  }, [patientAlerts, setContextAlerts]);

  return (
    <div className={`patients-page ${patientFocusMode ? "patient-focus-mode" : ""}`}>
      <div className="patients-list-column">
        <div className="patients-search-bar">
          <input
            type="text"
            placeholder="> buscar paciente..."
            className="search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <PatientList
          patients={patients}
          isLoading={patientsLoading}
          isError={patientsError}
          selectedId={effectiveSelectedPatientId}
          onSelect={handleSelectPatient}
          onRetry={refetchPatients}
        />
      </div>

      <div className="patients-profile-column" ref={profileColumnRef}>
        {effectiveSelectedPatientId && (
          <section className="patients-focus-header">
            <div className="patients-focus-copy">
              <span className="patients-focus-label">Paciente en prioridad</span>
              <strong>{selectedPatient?.full_name || effectiveSelectedPatientId}</strong>
            </div>
            <Button variant="secondary" size="sm" onClick={handleToggleFocusMode}>
              {patientFocusMode ? "Mostrar listado" : "Modo exclusivo"}
            </Button>
          </section>
        )}

        <section className="patients-inline-actions" aria-label="Acciones de paciente">
          {contextualActions.map((action) => (
            <Button
              key={action.id}
              variant={
                action.id === "register-episode" || action.id === "create-invoice"
                  ? "primary"
                  : "secondary"
              }
              onClick={action.onClick}
              disabled={action.disabled}
              isLoading={Boolean(action.loading)}
              title={action.title}
              size="sm"
            >
              <span className="patients-inline-action-label">
                {action.icon}
                <span>{action.label}</span>
              </span>
            </Button>
          ))}
        </section>
        {(actionMessage || actionError) && (
          <section className="patients-inline-feedback" aria-live="polite">
            {actionMessage && <p className="patients-inline-feedback-success">{actionMessage}</p>}
            {actionError && <p className="patients-inline-feedback-error">{actionError}</p>}
          </section>
        )}

        {showEpisodeForm && effectiveSelectedPatientId && (
          <section className="patients-episode-form">
            <h4 className="patients-episode-form-title">Nuevo episodio clínico</h4>
            <div className="patients-episode-form-row">
              <label>
                Tipo de episodio
                <input
                  className="patients-episode-form-input"
                  value={episodeForm.episode_type}
                  onChange={(e) => setEpisodeForm((f) => ({ ...f, episode_type: e.target.value }))}
                  placeholder="Ej: Seguimiento, Urgencia..."
                />
              </label>
              <label>
                Diagnóstico
                <input
                  className="patients-episode-form-input"
                  value={episodeForm.diagnosis}
                  onChange={(e) => setEpisodeForm((f) => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="Diagnóstico principal"
                />
              </label>
              <label>
                Fecha de inicio
                <input
                  className="patients-episode-form-input"
                  type="date"
                  value={episodeForm.start_date}
                  onChange={(e) => setEpisodeForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </label>
            </div>
            <label>
              Notas
              <textarea
                className="patients-episode-form-textarea"
                rows={2}
                value={episodeForm.notes}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Contexto clínico del episodio..."
              />
            </label>
            <div className="patients-episode-form-actions">
              <Button variant="secondary" size="sm" onClick={() => setShowEpisodeForm(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSubmitEpisode()}
                isLoading={activeAction === "episode"}
              >
                Crear episodio
              </Button>
            </div>
          </section>
        )}

        {showInvoiceForm && effectiveSelectedPatientId && (
          <section className="patients-episode-form">
            <h4 className="patients-episode-form-title">Nueva factura</h4>
            <div className="patients-episode-form-row">
              <label>
                Fecha de emisión *
                <input
                  className="patients-episode-form-input"
                  type="date"
                  value={invoiceForm.issue_date}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, issue_date: e.target.value }))}
                />
              </label>
              <label>
                Aseguradora
                <input
                  className="patients-episode-form-input"
                  value={invoiceForm.insurer_name}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, insurer_name: e.target.value }))
                  }
                  placeholder="Nombre de aseguradora"
                />
              </label>
            </div>
            <div className="patients-episode-form-row">
              <label>
                Item (opcional)
                <input
                  className="patients-episode-form-input"
                  value={invoiceForm.item_description}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, item_description: e.target.value }))
                  }
                  placeholder="Ej: Consulta de control"
                />
              </label>
              <label>
                Cantidad
                <input
                  className="patients-episode-form-input"
                  type="number"
                  min={1}
                  step={1}
                  value={invoiceForm.item_quantity}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, item_quantity: e.target.value }))
                  }
                />
              </label>
              <label>
                Precio unitario
                <input
                  className="patients-episode-form-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={invoiceForm.item_unit_price}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, item_unit_price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </label>
            </div>
            <label>
              Notas de facturación
              <textarea
                className="patients-episode-form-textarea"
                rows={2}
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notas internas de la factura..."
              />
            </label>
            <div className="patients-episode-form-actions">
              <Button variant="secondary" size="sm" onClick={() => setShowInvoiceForm(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSubmitInvoice()}
                isLoading={activeAction === "invoice"}
              >
                Crear factura
              </Button>
            </div>
          </section>
        )}

        {showNotesForm && effectiveSelectedPatientId && (
          <section className="patients-episode-form">
            <h4 className="patients-episode-form-title">Editar notas del expediente</h4>
            <label>
              Notas
              <textarea
                className="patients-episode-form-textarea"
                rows={4}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Escribe observaciones clínicas o administrativas..."
              />
            </label>
            <div className="patients-episode-form-actions">
              <Button variant="secondary" size="sm" onClick={() => setShowNotesForm(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSubmitNotes()}
                isLoading={activeAction === "update"}
              >
                Guardar notas
              </Button>
            </div>
          </section>
        )}

        <PatientProfile
          profile={patientProfile ?? null}
          isLoading={patientLoading}
          isError={patientError}
          onRetry={() => void refetchProfile()}
        />
      </div>

    </div>
  );
}
