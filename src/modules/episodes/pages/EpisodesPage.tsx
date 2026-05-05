import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Badge from "../../../components/common/Badge";
import type { ApiError } from "../../../types/common";
import Button from "../../../components/common/Button";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { episodesEndpoints, patientsEndpoints } from "../../../services/endpoints";
import { formatDateTime } from "../../../utils/format";
import "./EpisodesPage.css";

const getStatusVariant = (
  status: string
): "success" | "warning" | "error" | "info" | "neutral" => {
  switch (status) {
    case "open":
      return "success";
    case "closed":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
};

export default function EpisodesPage() {
  const [searchParams] = useSearchParams();
  const patientIdFilter = searchParams.get("patientId");
  const episodeIdFilter = searchParams.get("episodeId");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(episodeIdFilter);
  const [editStatus, setEditStatus] = useState<"open" | "closed" | "cancelled">("open");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["episodes-page", patientIdFilter],
    queryFn: async () => {
      const [episodesPage, patientsPage] = await Promise.all([
        episodesEndpoints.list(1, 100),
        patientsEndpoints.list(1, 100),
      ]);

      const patientsById = Object.fromEntries(
        patientsPage.items.map((patient) => [patient.id, patient])
      );

      const filteredEpisodes = episodesPage.items
        .filter((episode) => !patientIdFilter || episode.patient_id === patientIdFilter)
        .sort(
          (left, right) =>
            new Date(right.start_date).getTime() - new Date(left.start_date).getTime()
        );

      return {
        episodes: filteredEpisodes,
        patientsById,
      };
    },
  });

  const selectedEpisode = useMemo(() => {
    const targetId = selectedEpisodeId || episodeIdFilter;
    return data?.episodes.find((episode) => episode.id === targetId) || data?.episodes[0] || null;
  }, [data, episodeIdFilter, selectedEpisodeId]);

  useEffect(() => {
    if (!selectedEpisode) return;
    setEditStatus(selectedEpisode.status);
    setEditDiagnosis(selectedEpisode.diagnosis || "");
    setEditNotes(selectedEpisode.notes || "");
    setEditEndDate(selectedEpisode.end_date ? selectedEpisode.end_date.slice(0, 10) : "");
    setEditMessage(null);
    setEditError(null);
  }, [selectedEpisode?.id]);

  const handleSaveEpisode = () => {
    if (!selectedEpisode) return;

    const run = async () => {
      setSavingEpisode(true);
      setEditMessage(null);
      setEditError(null);
      try {
        await episodesEndpoints.update(selectedEpisode.id, {
          status: editStatus,
          diagnosis: editDiagnosis.trim() || null,
          notes: editNotes.trim() || null,
          end_date: editEndDate ? new Date(`${editEndDate}T00:00:00`).toISOString() : null,
        });
        await refetch();
        setEditMessage("Episodio actualizado correctamente.");
      } catch (error) {
        const apiError = error as ApiError;
        setEditError(apiError.message || "No se pudo actualizar el episodio.");
      } finally {
        setSavingEpisode(false);
      }
    };

    void run();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <Error message="No se pudieron cargar episodios." onRetry={() => void refetch()} />;
  }

  return (
    <div className="data-screen">
      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Gestión clínica</span>
          <h1>Episodios clínicos</h1>
          <p className="data-screen-description">
            Seguimiento clínico por paciente, con acceso rápido a estado, diagnóstico y notas.
          </p>
          {patientIdFilter && (
            <p className="data-screen-description">
              Filtro activo por paciente: <strong>{patientIdFilter}</strong>
            </p>
          )}
        </div>
        <div className="data-screen-actions">
          <Button variant="secondary" onClick={() => void refetch()} isLoading={isFetching}>
            Actualizar
          </Button>
        </div>
      </section>

      {data.episodes.length === 0 ? (
        <Empty message="No hay episodios registrados para este contexto." />
      ) : (
        <section className="data-split">
          <article className="data-card">
            <header className="data-card-header">
              <div>
                <h2 className="data-card-title">Lista de episodios</h2>
                <p className="data-card-subtitle">{data.episodes.length} registros</p>
              </div>
            </header>
            <div className="data-card-body">
              <div className="data-list">
                {data.episodes.map((episode) => {
                  const patient = data.patientsById[episode.patient_id];
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      className="data-list-item"
                      onClick={() => setSelectedEpisodeId(episode.id)}
                      style={{
                        borderColor:
                          selectedEpisode?.id === episode.id
                            ? "var(--accent-primary)"
                            : "var(--border-subtle)",
                      }}
                    >
                      <div className="data-list-copy">
                        <div className="data-list-title">{episode.episode_type}</div>
                        <div className="data-list-meta">
                          {patient?.full_name || episode.patient_id} · {formatDateTime(episode.start_date)}
                        </div>
                        <div className="data-list-meta">
                          {episode.diagnosis || episode.notes || "Sin resumen clínico"}
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(episode.status)}>{episode.status}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="data-card">
            <header className="data-card-header">
              <div>
                <h2 className="data-card-title">Detalle del episodio</h2>
                <p className="data-card-subtitle">
                  {selectedEpisode ? selectedEpisode.id : "Selecciona un episodio"}
                </p>
              </div>
            </header>
            <div className="data-card-body">
              {!selectedEpisode ? (
                <Empty message="Selecciona un episodio para ver detalle." />
              ) : (
                <div className="data-list">
                  <div className="data-list-item">
                    <div className="data-list-copy">
                      <div className="data-list-title">{selectedEpisode.episode_type}</div>
                      <div className="data-list-meta">
                        Paciente:{" "}
                        {data.patientsById[selectedEpisode.patient_id]?.full_name ||
                          selectedEpisode.patient_id}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(selectedEpisode.status)}>
                      {selectedEpisode.status}
                    </Badge>
                  </div>
                  <div className="data-stat-grid">
                    <article className="data-stat-card">
                      <span className="data-stat-label">Inicio</span>
                      <strong className="data-stat-value">
                        {formatDateTime(selectedEpisode.start_date)}
                      </strong>
                    </article>
                    <article className="data-stat-card">
                      <span className="data-stat-label">Fin</span>
                      <strong className="data-stat-value">
                        {selectedEpisode.end_date ? formatDateTime(selectedEpisode.end_date) : "Abierto"}
                      </strong>
                    </article>
                    <article className="data-stat-card">
                      <span className="data-stat-label">Aseguradora</span>
                      <strong className="data-stat-value">
                        {selectedEpisode.insurer_name || "Sin registro"}
                      </strong>
                    </article>
                  </div>
                  <div className="data-list-item">
                    <div className="data-list-copy">
                      <div className="data-list-title">Diagnóstico</div>
                      <div className="data-list-meta">
                        {selectedEpisode.diagnosis || "Sin diagnóstico explícito"}
                      </div>
                    </div>
                  </div>
                  <div className="data-list-item">
                    <div className="data-list-copy">
                      <div className="data-list-title">Notas</div>
                      <div className="data-list-meta">
                        {selectedEpisode.notes || "Sin notas registradas"}
                      </div>
                    </div>
                  </div>

                  <section className="episodes-edit-panel">
                    <h3>Editar episodio</h3>
                    <div className="episodes-edit-grid">
                      <label>
                        Estado
                        <select
                          value={editStatus}
                          onChange={(event) =>
                            setEditStatus(event.target.value as "open" | "closed" | "cancelled")
                          }
                        >
                          <option value="open">open</option>
                          <option value="closed">closed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </label>
                      <label>
                        Fecha de cierre
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(event) => setEditEndDate(event.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Diagnóstico
                      <input
                        value={editDiagnosis}
                        onChange={(event) => setEditDiagnosis(event.target.value)}
                        placeholder="Diagnóstico principal"
                      />
                    </label>
                    <label>
                      Notas
                      <textarea
                        rows={3}
                        value={editNotes}
                        onChange={(event) => setEditNotes(event.target.value)}
                        placeholder="Notas clínicas del episodio"
                      />
                    </label>
                    <div className="episodes-edit-actions">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (!selectedEpisode) return;
                          setEditStatus(selectedEpisode.status);
                          setEditDiagnosis(selectedEpisode.diagnosis || "");
                          setEditNotes(selectedEpisode.notes || "");
                          setEditEndDate(
                            selectedEpisode.end_date ? selectedEpisode.end_date.slice(0, 10) : ""
                          );
                          setEditMessage(null);
                          setEditError(null);
                        }}
                      >
                        Revertir
                      </Button>
                      <Button onClick={handleSaveEpisode} isLoading={savingEpisode}>
                        Guardar cambios
                      </Button>
                    </div>
                    {editMessage && <p className="episodes-edit-message success">{editMessage}</p>}
                    {editError && <p className="episodes-edit-message error">{editError}</p>}
                  </section>
                </div>
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
