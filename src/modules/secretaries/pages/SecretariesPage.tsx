import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import { Error, Loading } from "../../../components/states/StateContainers";
import { secretaryAdapter } from "../../../services/adapters";
import { doctorsEndpoints, secretariesEndpoints } from "../../../services/endpoints";
import { formatDate } from "../../../utils/format";

const createDoctorLookup = (items: { id: string; full_name: string }[]) =>
  Object.fromEntries(items.map((item) => [item.id, item.full_name]));

export default function SecretariesPage() {
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
            variant="secondary"
            onClick={() => void refetch()}
            isLoading={isFetching}
          >
            Actualizar
          </Button>
        </div>
      </section>

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
                <Badge variant={secretary.status === "active" ? "success" : "neutral"}>
                  {secretary.status.toUpperCase()}
                </Badge>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
