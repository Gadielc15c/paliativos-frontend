import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Edit2, FileText, FolderOpen, Plus } from "lucide-react";
import { PatientList, PatientProfile } from "../components";
import { usePatients, usePatientDetail } from "../hooks";
import Button from "../../../components/common/Button";
import {
  billingEndpoints,
  documentsEndpoints,
  episodesEndpoints,
  financeEndpoints,
  patientConditionsEndpoints,
  patientsEndpoints,
} from "../../../services/endpoints";
import { toNumber } from "../../../services/adapters";
import type { ApiError } from "../../../types/common";
import { useContextActions } from "../../../app/store/useContextActions";
import type { ContextAction } from "../../../app/store/useContextActions";
import { formatCurrency } from "../../../utils/format";
import "./PatientsPage.css";

const sortByDateDesc = <T,>(items: T[], accessor: (item: T) => string | null | undefined) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(accessor(left) || 0).getTime();
    const rightTime = new Date(accessor(right) || 0).getTime();
    return rightTime - leftTime;
  });

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
    data: selectedPatient,
    isLoading: patientLoading,
    isError: patientError,
    refetch: refetchPatient,
  } = usePatientDetail(effectiveSelectedPatientId);

  const {
    data: patientWorkspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
    refetch: refetchWorkspace,
  } = useQuery({
    queryKey: ["patient-workspace", effectiveSelectedPatientId],
    enabled: !!effectiveSelectedPatientId,
    queryFn: async () => {
      const patientId = effectiveSelectedPatientId!;
      const [conditionsPage, episodesPage, invoicesPage, documentsPage, paymentsPage] =
        await Promise.all([
          patientConditionsEndpoints.listForPatient(patientId, 1, 100),
          episodesEndpoints.list(1, 100),
          billingEndpoints.listInvoices(1, 100),
          documentsEndpoints.list(1, 100),
          financeEndpoints.listPayments(1, 100),
        ]);

      const episodes = sortByDateDesc(
        episodesPage.items.filter((episode) => episode.patient_id === patientId),
        (episode) => episode.start_date
      );
      const invoices = sortByDateDesc(
        invoicesPage.items.filter((invoice) => invoice.patient_id === patientId),
        (invoice) => invoice.issue_date
      );
      const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
      const payments = sortByDateDesc(
        paymentsPage.items.filter(
          (payment) => payment.patient_id === patientId || invoiceIds.has(payment.invoice_id)
        ),
        (payment) => payment.payment_date
      );
      const documents = sortByDateDesc(
        documentsPage.items.filter(
          (document) =>
            document.patient_id === patientId || document.matched_patient_id === patientId
        ),
        (document) => document.created_at
      );

      const billedTotal = invoices.reduce(
        (total, invoice) => total + toNumber(invoice.total),
        0
      );
      const paidTotal = payments.reduce(
        (total, payment) => total + toNumber(payment.amount),
        0
      );

      return {
        conditions: conditionsPage.items,
        episodes,
        invoices,
        documents,
        payments,
        summary: {
          billedTotal,
          paidTotal,
          balanceTotal: Math.max(billedTotal - paidTotal, 0),
          invoiceCount: invoices.length,
          paymentsCount: payments.length,
          documentCount: documents.length,
          appliedDocumentCount: documents.filter((document) => document.application_status === "applied").length,
          pendingDocumentCount: documents.filter((document) => document.application_status !== "applied").length,
          episodeCount: episodes.length,
          openEpisodeCount: episodes.filter((episode) => episode.status === "open").length,
          conditionCount: conditionsPage.items.length,
          activeConditionCount: conditionsPage.items.filter((condition) => condition.status === "active").length,
        },
      };
    },
  });

  const patientAlerts = useMemo(() => {
    if (!selectedPatient) return [];

    const alerts: Array<{
      tone: "info" | "warning" | "error" | "success";
      message: string;
    }> = [];

    if (!selectedPatient.insuranceCompany) {
      alerts.push({
        tone: "warning",
        message: "Paciente sin aseguradora registrada. Conviene completar cobertura antes de facturar.",
      });
    }

    if ((patientWorkspace?.summary.balanceTotal || 0) > 0) {
      alerts.push({
        tone: "warning",
        message: `Saldo pendiente acumulado: ${patientWorkspace?.summary.balanceTotal.toFixed(2)}.`,
      });
    }

    if ((patientWorkspace?.summary.conditionCount || 0) === 0) {
      alerts.push({
        tone: "info",
        message: "Todavía no hay historial médico estructurado para este paciente.",
      });
    }

    if ((patientWorkspace?.summary.pendingDocumentCount || 0) > 0) {
      alerts.push({
        tone: "info",
        message: "Hay documentos subidos que todavía no fueron aplicados al dominio.",
      });
    }

    if ((patientWorkspace?.summary.openEpisodeCount || 0) > 0) {
      alerts.push({
        tone: "success",
        message: "Paciente con episodio clínico abierto y en seguimiento.",
      });
    }

    return alerts;
  }, [patientWorkspace, selectedPatient]);

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
          insurer_name: selectedPatient?.insuranceCompany || undefined,
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
    const summary = patientWorkspace?.summary;
    setContextSummary("Resumen rápido", [
      { label: "Paciente", value: selectedPatient.name || "Sin selección" },
      {
        label: "Aseguradora",
        value: selectedPatient.insuranceCompany || "Sin registro",
      },
      { label: "Balance", value: formatCurrency(summary?.balanceTotal || 0) },
      { label: "Documentos", value: String(summary?.documentCount || 0) },
      { label: "Episodios abiertos", value: String(summary?.openEpisodeCount || 0) },
      { label: "Condiciones activas", value: String(summary?.activeConditionCount || 0) },
    ]);
  }, [selectedPatient, patientWorkspace, setContextSummary]);

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
          patient={selectedPatient}
          workspace={patientWorkspace}
          isLoading={patientLoading || workspaceLoading}
          isError={patientError || workspaceError}
          onRetry={() => {
            void Promise.all([refetchPatient(), refetchWorkspace()]);
          }}
        />
      </div>

    </div>
  );
}
