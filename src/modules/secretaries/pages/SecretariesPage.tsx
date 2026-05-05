import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import { Error, Loading } from "../../../components/states/StateContainers";
import { secretaryAdapter } from "../../../services/adapters";
import { doctorsEndpoints, secretariesEndpoints } from "../../../services/endpoints";
import type { ApiError } from "../../../types/common";
import { formatDate } from "../../../utils/format";

const createDoctorLookup = (items: { id: string; full_name: string }[]) =>
  Object.fromEntries(items.map((item) => [item.id, item.full_name]));

export default function SecretariesPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    doctor_id: "",
    phone: "",
    email: "",
    notes: "",
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["secretaries", "list"],
    queryFn: async () => {
      const [secretariesPage, doctorsPage] = await Promise.all([
        secretariesEndpoints.list(1, 100),
        doctorsEndpoints.list(1, 100, true),
      ]);

      const doctorsById = createDoctorLookup(doctorsPage.items);

      return secretariesPage.items.map((secretary) =>
        secretaryAdapter.toInternal(
          secretary,
          doctorsById[secretary.doctor_id] || secretary.doctor_id
        )
      );
    },
  });

  const { data: doctorsPage } = useQuery({
    queryKey: ["secretaries", "doctors"],
    queryFn: () => doctorsEndpoints.list(1, 100, true),
  });

  const doctors = doctorsPage?.items || [];

  const resetMessages = () => {
    setActionError(null);
    setActionMessage(null);
  };

  const handleCreateSecretary = () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.doctor_id) {
      setActionError("Completa nombre, apellido y doctor asignado.");
      return;
    }

    const run = async () => {
      setSubmitting(true);
      resetMessages();
      try {
        await secretariesEndpoints.create({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          doctor_id: form.doctor_id,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
          is_active: true,
        });
        setActionMessage("Secretaria creada correctamente.");
        setShowCreateForm(false);
        setForm({
          first_name: "",
          last_name: "",
          doctor_id: "",
          phone: "",
          email: "",
          notes: "",
        });
        await queryClient.invalidateQueries({ queryKey: ["secretaries", "list"] });
        await refetch();
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo crear la secretaria.");
      } finally {
        setSubmitting(false);
      }
    };

    void run();
  };

  const handleToggleSecretary = (secretaryId: string, currentStatus: "active" | "inactive") => {
    const run = async () => {
      setSubmitting(true);
      resetMessages();
      try {
        await secretariesEndpoints.update(secretaryId, {
          is_active: currentStatus !== "active",
        });
        setActionMessage("Estado de secretaria actualizado.");
        await queryClient.invalidateQueries({ queryKey: ["secretaries", "list"] });
        await refetch();
      } catch (error) {
        const apiError = error as ApiError;
        setActionError(apiError.message || "No se pudo actualizar estado.");
      } finally {
        setSubmitting(false);
      }
    };

    void run();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <Error message="No se pudieron cargar secretarias." onRetry={() => void refetch()} />;
  }

  return (
    <div className="data-screen">
      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Coordinación clínica</span>
          <h1>Asignaciones activas</h1>
          <p className="data-screen-description">
            Asignaciones por médico con estado operativo y datos de contacto.
          </p>
        </div>
        <div className="data-screen-actions">
          <Button
            variant="primary"
            onClick={() => {
              setShowCreateForm((v) => !v);
              resetMessages();
            }}
          >
            {showCreateForm ? "Cancelar alta" : "Nueva secretaria"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void refetch()}
            isLoading={isFetching}
          >
            Actualizar
          </Button>
        </div>
      </section>

      {showCreateForm && (
        <section className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Alta de secretaria</h2>
            </div>
          </header>
          <div className="data-card-body">
            <div className="data-stat-grid">
              <label>
                Nombre
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </label>
              <label>
                Apellido
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </label>
              <label>
                Doctor asignado
                <select
                  value={form.doctor_id}
                  onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                >
                  <option value="">Selecciona doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Teléfono
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label>
                Correo
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
            </div>
            <label>
              Notas
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <div className="data-screen-actions">
              <Button
                onClick={handleCreateSecretary}
                isLoading={submitting}
                disabled={!form.first_name.trim() || !form.last_name.trim() || !form.doctor_id}
              >
                Crear secretaria
              </Button>
            </div>
          </div>
        </section>
      )}

      {(actionMessage || actionError) && (
        <section className="data-card">
          <div className="data-card-body">
            {actionMessage && <p className="contextual-panel-feedback success">{actionMessage}</p>}
            {actionError && <p className="contextual-panel-feedback error">{actionError}</p>}
          </div>
        </section>
      )}

      <section className="data-stat-grid">
        <article className="data-stat-card">
          <span className="data-stat-label">Total</span>
          <strong className="data-stat-value">{data.length}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Activas</span>
          <strong className="data-stat-value">
            {data.filter((secretary) => secretary.status === "active").length}
          </strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Inactivas</span>
          <strong className="data-stat-value">
            {data.filter((secretary) => secretary.status === "inactive").length}
          </strong>
        </article>
      </section>

      <section className="data-card">
        <header className="data-card-header">
          <div>
            <h2 className="data-card-title">Equipo</h2>
            <p className="data-card-subtitle">Listado operativo por médico</p>
          </div>
        </header>
        <div className="data-card-body">
          <div className="data-list">
            {data.map((secretary) => (
              <article className="data-list-item" key={secretary.id}>
                <div className="data-list-copy">
                  <strong className="data-list-title">{secretary.name}</strong>
                  <span className="data-list-meta">
                    {secretary.assignedDoctor} · {secretary.email || secretary.phone || "Sin contacto"}
                  </span>
                  <span className="data-list-meta">
                    Actualizado {formatDate(secretary.updatedAt)}
                  </span>
                  {secretary.notes && (
                    <span className="data-list-meta">{secretary.notes}</span>
                  )}
                </div>
                <div className="data-screen-actions">
                  <Badge variant={secretary.status === "active" ? "success" : "neutral"}>
                    {secretary.status.toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={submitting}
                    onClick={() => handleToggleSecretary(secretary.id, secretary.status)}
                  >
                    {secretary.status === "active" ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
