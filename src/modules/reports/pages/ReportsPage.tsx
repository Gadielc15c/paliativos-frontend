import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import { Error, Loading } from "../../../components/states/StateContainers";
import { reportsEndpoints } from "../../../services/endpoints";
import { toNumber } from "../../../services/adapters";
import { formatCurrency, formatNumber } from "../../../utils/format";
import "./ReportsPage.css";

const formatDoctorName = (doctorId: string | null, doctorName: string | null) =>
  doctorName || doctorId || "Sin asignar";

export default function ReportsPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: () => reportsEndpoints.getDashboard(),
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <Error message="No se pudieron cargar reportes." onRetry={() => void refetch()} />;
  }

  const globalSummary = data.summary.global_summary;
  const patientsTotal = data.patientsByDoctor.reduce(
    (total, row) => total + row.total_count,
    0
  );
  const invoicesTotal = data.invoicesByStatus.reduce(
    (total, row) => total + row.invoice_count,
    0
  );

  return (
    <div className="data-screen reports-page">
      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Reportería ejecutiva</span>
          <h1>Panel financiero</h1>
          <p className="data-screen-description">
            Agregados operativos de ingresos, egresos, pacientes y facturas por estado.
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
          <span className="data-stat-label">Ingreso total</span>
          <strong className="data-stat-value">
            {formatCurrency(toNumber(globalSummary.income_total))}
          </strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Egreso total</span>
          <strong className="data-stat-value">
            {formatCurrency(toNumber(globalSummary.expense_total))}
          </strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Resultado neto</span>
          <strong className="data-stat-value">
            {formatCurrency(toNumber(globalSummary.net_total))}
          </strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Pacientes / Facturas</span>
          <strong className="data-stat-value">
            {formatNumber(patientsTotal, 0)} / {formatNumber(invoicesTotal, 0)}
          </strong>
        </article>
      </section>

      <section className="data-split">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Balance por médico</h2>
              <p className="data-card-subtitle">Ingreso, gasto y neto por responsable</p>
            </div>
          </header>
          <div className="data-card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Médico</th>
                  <th>Ingreso</th>
                  <th>Egreso</th>
                  <th>Neto</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.per_doctor.map((row) => (
                  <tr key={row.doctor_id || row.doctor_name || "unassigned"}>
                    <td>{formatDoctorName(row.doctor_id, row.doctor_name)}</td>
                    <td className="data-table-mono">
                      {formatCurrency(toNumber(row.income_total))}
                    </td>
                    <td className="data-table-mono">
                      {formatCurrency(toNumber(row.expense_total))}
                    </td>
                    <td className="data-table-mono">
                      {formatCurrency(toNumber(row.net_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Facturas por estado</h2>
              <p className="data-card-subtitle">Conteo y monto agregado</p>
            </div>
          </header>
          <div className="data-card-body">
            <div className="data-list">
              {data.invoicesByStatus.map((row) => (
                <div className="data-list-item" key={row.status}>
                  <div className="data-list-copy">
                    <strong className="data-list-title">{row.status}</strong>
                    <span className="data-list-meta">
                      {formatNumber(row.invoice_count, 0)} facturas
                    </span>
                  </div>
                  <strong className="data-table-mono">
                    {formatCurrency(toNumber(row.total_amount))}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="data-split">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Pacientes por médico</h2>
              <p className="data-card-subtitle">Activos vs eliminados</p>
            </div>
          </header>
          <div className="data-card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Médico</th>
                  <th>Total</th>
                  <th>Activos</th>
                  <th>Eliminados</th>
                </tr>
              </thead>
              <tbody>
                {data.patientsByDoctor.map((row) => (
                  <tr key={row.doctor_id || row.doctor_name || "unassigned"}>
                    <td>{formatDoctorName(row.doctor_id, row.doctor_name)}</td>
                    <td className="data-table-mono">{formatNumber(row.total_count, 0)}</td>
                    <td className="data-table-mono">{formatNumber(row.active_count, 0)}</td>
                    <td className="data-table-mono">{formatNumber(row.deleted_count, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Ingresos y egresos</h2>
              <p className="data-card-subtitle">Comparativo por responsable</p>
            </div>
          </header>
          <div className="data-card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Médico</th>
                  <th>Pagos</th>
                  <th>Ingresos</th>
                  <th>Egresos</th>
                </tr>
              </thead>
              <tbody>
                {data.incomeByDoctor.map((incomeRow) => {
                  const expenseRow = data.expensesByDoctor.find(
                    (item) => item.doctor_id === incomeRow.doctor_id
                  );

                  return (
                    <tr key={incomeRow.doctor_id || incomeRow.doctor_name || "unassigned"}>
                      <td>
                        {formatDoctorName(incomeRow.doctor_id, incomeRow.doctor_name)}
                      </td>
                      <td className="data-table-mono">
                        {formatNumber(incomeRow.payments_count, 0)}
                      </td>
                      <td className="data-table-mono">
                        {formatCurrency(toNumber(incomeRow.total_income))}
                      </td>
                      <td className="data-table-mono">
                        {formatCurrency(toNumber(expenseRow?.total_expenses))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
