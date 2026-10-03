import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Edit2, FileText, FolderOpen, History, PanelLeftClose, PanelLeftOpen, Plus, Search, Stethoscope } from "lucide-react";
import { PatientList, PatientProfile } from "../components";
import { PROFILE_TABS, type ProfileTab } from "../components/PatientProfile";
import Pill from "../../../components/common/Pill";
import { useDashboardAlerts } from "../../../components/clinical/alerts";
import { usePermission } from "../../../utils/usePermission";
import type { AlertType } from "../../../types/dashboard";
import { usePatients } from "../hooks";
import Button from "../../../components/common/Button";
import ActionBar from "../../../components/common/ActionBar";
import {
  billingEndpoints,
  episodesEndpoints,
  patientsEndpoints,
  soapEndpoints,
} from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import { useContextActions } from "../../../app/store/useContextActions";
import type { ContextAction } from "../../../app/store/useContextActions";
import "./PatientsPage.css";

/** `/patients?filter=` values (dashboard alert action routes) → pill label. */
const FILTER_LABELS: Partial<Record<AlertType, string>> = {
  overdue_followup: "Sin seguimiento",
  unsigned_drafts: "Notas sin firmar",
  missing_diagnosis: "Consultas sin CIE-10",
  frequent_visits: "Consultas frecuentes",
  new_symptoms: "Síntomas nuevos",
};

export default function PatientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPatientId = searchParams.get("patientId");
  const initialFocusMode = searchParams.get("focus") === "1" || !!searchParams.get("patientId");
  const tabParam = searchParams.get("tab") as ProfileTab | null;
  const tab: ProfileTab = tabParam && PROFILE_TABS.includes(tabParam) ? tabParam : "summary";
  const setTab = (next: ProfileTab) => {
    const p = new URLSearchParams(searchParams);
    if (next === "summary") p.delete("tab"); else p.set("tab", next);
    setSearchParams(p, { replace: true });
  };
  const listFilter = searchParams.get("filter") as AlertType | null;
  const canWriteClinical = usePermission("clinical:write");
  const canBilling = usePermission("billing:read");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientFocusMode, setPatientFocusMode] = useState(initialFocusMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAction, setActiveAction] = useState<"episode" | "invoice" | "update" | null>(
    null
  );
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

  // Alert filters: the list shows the patients the matching /dashboard/alerts items reference.
  const alertsQuery = useDashboardAlerts();
  const filterInfo = useMemo(() => {
    if (!listFilter) return null;
    const items = (alertsQuery.data?.items ?? []).filter((a) => a.type === listFilter);
    const notes = new Map<string, string>();
    items.forEach((a) => a.patients.forEach((p) => { if (!notes.has(p.id)) notes.set(p.id, p.note ?? ""); }));
    const count = items.reduce((n, a) => n + a.count, 0);
    return { label: FILTER_LABELS[listFilter] ?? "Filtro de alerta", notes, count, loaded: alertsQuery.isSuccess };
  }, [listFilter, alertsQuery.data, alertsQuery.isSuccess]);
  const visiblePatients = useMemo(() => {
    if (!filterInfo || !patients) return patients;
    return patients.filter((p) => filterInfo.notes.has(p.id));
  }, [patients, filterInfo]);
  const clearFilter = () => { const p = new URLSearchParams(searchParams); p.delete("filter"); setSearchParams(p, { replace: true }); };

  const createConsultation = useMutation({
    mutationFn: () => soapEndpoints.create({ patient_id: effectiveSelectedPatientId!, consultation_date: new Date().toISOString() }),
    onSuccess: (c) => navigate(`/consultations/${c.id}`),
    onError: (e) => toast.error((e as unknown as ApiError)?.message || "No se pudo crear la consulta."),
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
    next.delete("tab");
    setSearchParams(next, { replace: true });
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
  };

  const handleSubmitEpisode = () => {
    if (!effectiveSelectedPatientId) return;

    const run = async () => {
      setActiveAction("episode");
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
        toast.success(`Episodio creado: ${episode.id}`);
        setShowEpisodeForm(false);
        setEpisodeForm({ episode_type: "Seguimiento", diagnosis: "", notes: "", start_date: "" });
        await refetchWorkspace();
        navigate(`/episodes?patientId=${effectiveSelectedPatientId}&episodeId=${episode.id}`);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message || "No se pudo crear episodio.");
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
      toast.error("Define la fecha de emisión de la factura.");
      return;
    }
    if (hasItem && (!Number.isFinite(quantity) || quantity <= 0)) {
      toast.error("La cantidad del item debe ser mayor a cero.");
      return;
    }
    if (hasItem && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
      toast.error("El precio unitario del item debe ser mayor a cero.");
      return;
    }

    const run = async () => {
      setActiveAction("invoice");
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
        toast.success(`Factura creada: ${invoice.invoice_number}`);
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
        toast.error(apiError.message || "No se pudo crear factura.");
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
    setNotesDraft(selectedPatient.notes || "");
  };

  const handleSubmitNotes = () => {
    if (!effectiveSelectedPatientId) return;

    const run = async () => {
      setActiveAction("update");
      try {
        await patientsEndpoints.update(effectiveSelectedPatientId, {
          notes: notesDraft.trim() || null,
        });
        await Promise.all([refetchPatient(), refetchPatients()]);
        setShowNotesForm(false);
        toast.success(`Notas del paciente ${effectiveSelectedPatientId} actualizadas.`);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message || "No se pudo actualizar notas.");
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
      icon: <Plus size={18} />,
      onClick: handleRegisterEpisode,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "episode",
      title: "Registrar un nuevo episodio clínico",
    },
    {
      id: "create-invoice",
      label: "Emitir factura",
      icon: <FileText size={18} />,
      onClick: handleCreateInvoice,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "invoice",
      title: "Emitir nueva factura",
    },
    {
      id: "open-billing",
      label: "Ver facturación",
      icon: <FileText size={18} />,
      onClick: handleOpenBilling,
      disabled: !effectiveSelectedPatientId,
      title: "Abrir facturación filtrada por paciente",
    },
    {
      id: "open-documents",
      label: "Ver documentos",
      icon: <FolderOpen size={18} />,
      onClick: handleOpenDocuments,
      disabled: !effectiveSelectedPatientId,
      title: "Ir al módulo documental",
    },
    {
      id: "update-data",
      label: "Actualizar notas",
      icon: <Edit2 size={18} />,
      onClick: handleUpdateData,
      disabled: !effectiveSelectedPatientId || activeAction !== null,
      loading: activeAction === "update",
      title: "Actualizar información del paciente",
    },
  ];

  const setContextActions = useContextActions((state) => state.setContextActions);
  const setContextSummary = useContextActions((state) => state.setContextSummary);
  const setContextAlerts = useContextActions((state) => state.setContextAlerts);
  const clearContextActions = useContextActions((state) => state.clearContextActions);

  useEffect(() => {
    setContextActions(contextualActions);
    return () => clearContextActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedPatientId, selectedPatient, activeAction]);


  useEffect(() => {
    if (!selectedPatient) {
      setContextSummary(null, []);
      return;
    }
    setContextSummary("Resumen rápido", [
      { label: "Paciente", value: selectedPatient.full_name || "Sin selección" },
      { label: "Aseguradora", value: selectedPatient.insurer_name || "Sin registro" },
      { label: "Documentos", value: String(patientProfile?.recent_documents.length || 0) },
      { label: "Condiciones activas", value: String(patientProfile?.active_conditions.length || 0) },
      { label: "Prescripciones activas", value: String(patientProfile?.active_prescriptions.length || 0) },
    ]);
  }, [selectedPatient, patientProfile, setContextSummary]);

  useEffect(() => {
    setContextAlerts(patientAlerts);
  }, [patientAlerts, setContextAlerts]);

  // One visit concept: "Nueva consulta" is THE action. Everything else waits in "…".
  const primaryAction: ContextAction | undefined = canWriteClinical
    ? { id: "new-consultation", label: "Nueva consulta", icon: <Stethoscope size={18} />, onClick: () => createConsultation.mutate(), loading: createConsultation.isPending, disabled: !effectiveSelectedPatientId, title: "Crear la nota de la visita de hoy" }
    : { id: "view-history", label: "Ver historial", icon: <History size={18} />, onClick: () => setTab("history"), title: "Consultas, recetas y documentos del paciente" };
  const secondaryActions = ["create-invoice", "open-billing", "register-episode", "update-data", "open-documents"]
    .map((id) => contextualActions.find((a) => a.id === id)!)
    .filter((a) => canBilling || (a.id !== "create-invoice" && a.id !== "open-billing"));
  const patientCount = patients?.length ?? 0;

  const profileActions = effectiveSelectedPatientId ? (
    <ActionBar
      className="patients-inline-actions"
      label="Acciones de paciente"
      primary={primaryAction}
      secondary={secondaryActions}
      inlineLimit={0}
    />
  ) : null;

  const profileForms = (
    <>
      {showEpisodeForm && effectiveSelectedPatientId && (
          <section className="patients-episode-form form-stack">
            <h2 className="patients-episode-form-title">Nuevo episodio clínico</h2>
            <div className="patients-episode-form-row form-grid">
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
            <div className="patients-episode-form-actions form-actions">
              <Button variant="gray" onClick={() => setShowEpisodeForm(false)}>
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
          <section className="patients-episode-form form-stack">
            <h2 className="patients-episode-form-title">Nueva factura</h2>
            <div className="patients-episode-form-row form-grid">
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
            <div className="patients-episode-form-row form-grid">
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
            <div className="patients-episode-form-actions form-actions">
              <Button variant="gray" onClick={() => setShowInvoiceForm(false)}>
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
          <section className="patients-episode-form form-stack">
            <h2 className="patients-episode-form-title">Editar notas del expediente</h2>
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
            <div className="patients-episode-form-actions form-actions">
              <Button variant="gray" onClick={() => setShowNotesForm(false)}>
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
    </>
  );

  return (
    <div
      className={`patients-page ${patientFocusMode ? "patient-focus-mode" : ""} ${
        effectiveSelectedPatientId ? "has-selection" : ""
      }`}
    >
      <aside className="patients-list-column" aria-label="Listado de pacientes">
        <header className="patients-list-head">
          <h1 className="patients-list-title">Pacientes</h1>
          {patientCount > 0 && <span className="patients-list-count">{patientCount} en seguimiento</span>}
        </header>
        {filterInfo && (
          <div className="patients-filter" aria-live="polite">
            <Pill tone="warning" removable onRemove={clearFilter} removeLabel="Quitar filtro">
              {filterInfo.loaded ? `${filterInfo.label} · ${filterInfo.count.toLocaleString("es-DO")}` : filterInfo.label}
            </Pill>
            {filterInfo.loaded && visiblePatients && visiblePatients.length < filterInfo.count && (
              <span className="patients-filter-note">{`Mostrando ${visiblePatients.length} de ${filterInfo.count.toLocaleString("es-DO")}: la alerta solo enumera los más urgentes.`}</span>
            )}
          </div>
        )}
        <label className="search-field glow-border glow-focus">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar paciente"
            aria-label="Buscar paciente"
            className="search-input"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <PatientList
          patients={visiblePatients}
          notes={filterInfo?.notes}
          emptyMessage={filterInfo ? (filterInfo.loaded ? "Ningún paciente coincide con esta alerta. Quita el filtro para ver a todos." : undefined) : searchQuery ? `Ningún paciente coincide con «${searchQuery}». Revisa el nombre o el documento.` : undefined}
          isLoading={patientsLoading || (!!filterInfo && alertsQuery.isLoading)}
          isError={patientsError}
          selectedId={effectiveSelectedPatientId}
          onSelect={handleSelectPatient}
          onRetry={refetchPatients}
        />
      </aside>

      <div className="patients-profile-column" ref={profileColumnRef}>
        {effectiveSelectedPatientId && (
          <section className="patients-focus-header">
            <button type="button" className="page-header-back patients-back" onClick={handleToggleFocusMode}>
              <ChevronLeft size={20} aria-hidden="true" />
              <span>Pacientes</span>
            </button>
            <Button variant="gray" size="sm" className="patients-focus-toggle" onClick={handleToggleFocusMode}>
              {patientFocusMode ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              <span>{patientFocusMode ? "Mostrar listado" : "Ocultar listado"}</span>
            </Button>
          </section>
        )}

        <PatientProfile
          tab={tab}
          onTabChange={setTab}
          headerActions={profileActions}
          headerExtra={profileForms}
          profile={patientProfile ?? null}
          isLoading={patientLoading}
          isError={patientError}
          onRetry={() => void refetchProfile()}
        />
      </div>

    </div>
  );
}
