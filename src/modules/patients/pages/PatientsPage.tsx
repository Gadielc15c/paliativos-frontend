import { useEffect, useMemo, useState } from "react";
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
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAction, setActiveAction] = useState<"episode" | "invoice" | "update" | null>(
    null
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    const next = new URLSearchParams(searchParams);
    next.set("patientId", id);
    setSearchParams(next, { replace: true });
    setActionMessage(null);
    setActionError(null);
  };

  const handleRegisterEpisode = () => {
    if (!effectiveSelectedPatientId) return;

    const run = async () => {
      setActiveAction("episode");
      setActionMessage(null);
      setActionError(null);
      try {
        const episode = await episodesEndpoints.create({
          patient_id: effectiveSelectedPatientId,
          episode_type: "Seguimiento",
          start_date: new Date().toISOString(),
          notes: "Creado desde interfaz de pacientes",
          status: "open",
        });
        setActionMessage(`Episodio creado: ${episode.id}`);
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

    const run = async () => {
      setActiveAction("invoice");
      setActionMessage(null);
      setActionError(null);
      try {
        const invoice = await billingEndpoints.createInvoice({
          patient_id: effectiveSelectedPatientId,
          issue_date: new Date().toISOString(),
          insurer_name: selectedPatient?.insurer_name || undefined,
          notes: "Factura creada desde interfaz de pacientes",
        });
        setActionMessage(`Factura creada: ${invoice.invoice_number}`);
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

    const run = async () => {
      setActiveAction("update");
      setActionMessage(null);
      setActionError(null);

      const nextNotes = selectedPatient.notes
        ? `${selectedPatient.notes}\n[${new Date().toISOString()}] Actualizado desde UI`
        : `[${new Date().toISOString()}] Actualizado desde UI`;

      try {
        await patientsEndpoints.update(effectiveSelectedPatientId, {
          notes: nextNotes,
        });
        await Promise.all([refetchPatient(), refetchPatients()]);
        setActionMessage(`Paciente ${effectiveSelectedPatientId} actualizado.`);
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo actualizar paciente.");
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
    <div className="patients-page">
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

      <div className="patients-profile-column">
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
