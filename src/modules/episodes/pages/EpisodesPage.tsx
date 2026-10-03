import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Pill from "../../../components/common/Pill";
import type { ApiError } from "../../../types/common";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import PageHeader from "../../../components/common/PageHeader";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { episodesEndpoints, patientsEndpoints } from "../../../services/endpoints";
import { formatDateTime } from "../../../utils/format";
import "./EpisodesPage.css";
import { label } from "../../../utils/labels";

const getStatusVariant = (
  status: string
): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "open":
      return "success";
    case "closed":
      return "info";
    case "cancelled":
      return "danger";
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
    }, [selectedEpisode?.id]);

  const handleSaveEpisode = () => {
    if (!selectedEpisode) return;

    const run = async () => {
      setSavingEpisode(true);
      try {
        await episodesEndpoints.update(selectedEpisode.id, {
          status: editStatus,
          diagnosis: editDiagnosis.trim() || null,
          notes: editNotes.trim() || null,
          end_date: editEndDate ? new Date(`${editEndDate}T00:00:00`).toISOString() : null,
        });
        await refetch();
        toast.success("Episodio actualizado correctamente.");
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message || "No se pudo actualizar el episodio.");
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

  const detailOpen = Boolean(selectedEpisodeId);
  const selectedPatient = selectedEpisode ? data.patientsById[selectedEpisode.patient_id] : null;

  return (
    <div className={`data-screen episodes-page ${detailOpen ? "detail-open" : ""}`}>
      <PageHeader
        className="episodes-header"
        eyebrow="Gestión clínica"
        title="Episodios clínicos"
        description="Seguimiento clínico por paciente: estado, diagnóstico y notas."
        actions={
          <Button variant="gray" onClick={() => void refetch()} isLoading={isFetching}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Actualizar</span>
          </Button>
        }
        filters={patientIdFilter ? <Pill tone="info">Filtrado por paciente</Pill> : undefined}
      />

      {data.episodes.length === 0 ? (
        <Empty message="Aún no hay episodios. Las visitas nuevas se registran con «Nueva consulta» desde la ficha del paciente." />
      ) : (
        <section className="data-split is-master-detail episodes-split">
          <div className="section-group episodes-list">
            <div className="section-group-header">
              <h2 className="section-group-title">Episodios</h2>
              <span className="section-group-meta">{data.episodes.length} registros</span>
            </div>
            <DataList
              label="Episodios"
              layout="cards"
              rows={data.episodes}
              rowKey={(episode) => episode.id}
              selectedKey={selectedEpisode?.id ?? null}
              onRowClick={(episode) => setSelectedEpisodeId(episode.id)}
              title={(episode) => data.patientsById[episode.patient_id]?.full_name || episode.patient_id}
              subtitle={(episode) => `${episode.episode_type} · ${formatDateTime(episode.start_date)}`}
              detail={(episode) => (
                <span className="episodes-list-summary">{episode.diagnosis || episode.notes || "Sin resumen clínico"}</span>
              )}
              status={(episode) => <Pill tone={getStatusVariant(episode.status)}>{label("episodeStatus", episode.status)}</Pill>}
              columns={[]}
            />
          </div>

          <div className="episodes-detail">
            <button type="button" className="page-header-back episodes-back" onClick={() => setSelectedEpisodeId(null)}>
              <ChevronLeft size={20} aria-hidden="true" />
              <span>Episodios</span>
            </button>
            {!selectedEpisode ? (
              <Empty message="Elige un episodio de la lista para ver su detalle." />
            ) : (
              <>
                <article className="data-card episodes-detail-card">
                  <header className="episodes-detail-head">
                    <div className="episodes-detail-heading">
                      <span className="page-header-eyebrow">{selectedEpisode.episode_type}</span>
                      <h2 className="episodes-detail-title">{selectedPatient?.full_name || selectedEpisode.patient_id}</h2>
                    </div>
                    <Pill tone={getStatusVariant(selectedEpisode.status)}>{label("episodeStatus", selectedEpisode.status)}</Pill>
                  </header>
                  <dl className="kv-list">
                    <div className="kv-row"><dt>Inicio</dt><dd>{formatDateTime(selectedEpisode.start_date)}</dd></div>
                    <div className="kv-row"><dt>Fin</dt><dd>{selectedEpisode.end_date ? formatDateTime(selectedEpisode.end_date) : "Abierto"}</dd></div>
                    <div className="kv-row"><dt>Aseguradora</dt><dd>{selectedEpisode.insurer_name || "Sin registro"}</dd></div>
                  </dl>
                  <div className="episodes-notes">
                    <div className="episodes-note">
                      <h3>Diagnóstico</h3>
                      <p>{selectedEpisode.diagnosis || "Sin diagnóstico explícito"}</p>
                    </div>
                    <div className="episodes-note">
                      <h3>Notas</h3>
                      <p>{selectedEpisode.notes || "Sin notas registradas"}</p>
                    </div>
                  </div>
                </article>

                  <section className="episodes-edit-panel data-card form-stack">
                    <h2 className="data-card-title">Editar episodio</h2>
                    <div className="episodes-edit-grid form-grid">
                      <label>
                        Estado
                        <select
                          value={editStatus}
                          onChange={(event) =>
                            setEditStatus(event.target.value as "open" | "closed" | "cancelled")
                          }
                        >
                          <option value="open">{label("episodeStatus", "open")}</option>
                          <option value="closed">{label("episodeStatus", "closed")}</option>
                          <option value="cancelled">{label("episodeStatus", "cancelled")}</option>
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
                    <div className="episodes-edit-actions form-actions">
                      <Button
                        variant="gray"
                        onClick={() => {
                          if (!selectedEpisode) return;
                          setEditStatus(selectedEpisode.status);
                          setEditDiagnosis(selectedEpisode.diagnosis || "");
                          setEditNotes(selectedEpisode.notes || "");
                          setEditEndDate(
                            selectedEpisode.end_date ? selectedEpisode.end_date.slice(0, 10) : ""
                          );
                          }}
                      >
                        Revertir
                      </Button>
                      <Button className="glow-border" onClick={handleSaveEpisode} isLoading={savingEpisode}>
                        Guardar cambios
                      </Button>
                    </div>
                  </section>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
