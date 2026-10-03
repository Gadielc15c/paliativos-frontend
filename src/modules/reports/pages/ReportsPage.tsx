import Pill from "../../../components/common/Pill";
import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import PageHeader from "../../../components/common/PageHeader";
import { RefreshCw } from "lucide-react";
import { Error, Loading } from "../../../components/states/StateContainers";
import { reportsEndpoints } from "../../../services/endpoints";
import { toNumber } from "../../../services/adapters";
import { formatCurrency, formatNumber } from "../../../utils/format";
import { label } from "../../../utils/labels";
import { useNavigate } from "react-router-dom";
import "./ReportsPage.css";

const formatDoctorName = (doctorId: string | null, doctorName: string | null) =>
  doctorName || doctorId || "Sin asignar";

export default function ReportsPage() {
  const navigate = useNavigate();
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
    return <Error message="No se pudieron cargar los reportes." onRetry={() => void refetch()} />;
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

  type IncomeRow = (typeof data.incomeByDoctor)[number];
  const expenseFor = (row: IncomeRow) =>
    data.expensesByDoctor.find((item) => item.doctor_id === row.doctor_id)?.total_expenses;
  const doctorKey = (row: { doctor_id: string | null; doctor_name: string | null }) =>
    row.doctor_id || row.doctor_name || "unassigned";

  return (
    <div className="data-screen reports-page">
      <PageHeader
        back={{ label: "Administración", onClick: () => navigate("/admin") }}
        title="Reportes"
        description="Ingresos, egresos, pacientes y facturas por estado."
        actions={
          <Button variant="gray" onClick={() => void refetch()} isLoading={isFetching}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Actualizar</span>
          </Button>
        }
      />

      <section className="data-stat-grid" aria-label="Totales">
        <article className="data-stat-card">
          <span className="data-stat-label">Ingreso total</span>
          <strong className="data-stat-value">{formatCurrency(toNumber(globalSummary.income_total))}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Egreso total</span>
          <strong className="data-stat-value">{formatCurrency(toNumber(globalSummary.expense_total))}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Resultado neto</span>
          <strong className="data-stat-value">{formatCurrency(toNumber(globalSummary.net_total))}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Pacientes · Facturas</span>
          <strong className="data-stat-value">
            {formatNumber(patientsTotal, 0)} · {formatNumber(invoicesTotal, 0)}
          </strong>
        </article>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Balance por médico</h2>
          <span className="section-group-meta">Ingreso, gasto y neto por responsable</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            <DataList
              label="Balance por médico"
              rows={data.summary.per_doctor}
              rowKey={doctorKey}
              title={(row) => formatDoctorName(row.doctor_id, row.doctor_name)}
              subtitle={(row) => `Ingreso ${formatCurrency(toNumber(row.income_total))} · Egreso ${formatCurrency(toNumber(row.expense_total))}`}
              detail={(row) => `Neto ${formatCurrency(toNumber(row.net_total))}`}
              columns={[
                { key: "doctor", header: "Médico", cell: (row) => formatDoctorName(row.doctor_id, row.doctor_name) },
                { key: "income", header: "Ingreso", cell: (row) => formatCurrency(toNumber(row.income_total)), align: "end", numeric: true },
                { key: "expense", header: "Egreso", cell: (row) => formatCurrency(toNumber(row.expense_total)), align: "end", numeric: true },
                { key: "net", header: "Neto", cell: (row) => <strong>{formatCurrency(toNumber(row.net_total))}</strong>, align: "end", numeric: true },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Facturas por estado</h2>
          <span className="section-group-meta">Conteo y monto agregado</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            <DataList
              label="Facturas por estado"
              rows={data.invoicesByStatus}
              rowKey={(row) => row.status}
              title={(row) => formatCurrency(toNumber(row.total_amount))}
              subtitle={(row) => `${formatNumber(row.invoice_count, 0)} facturas`}
              status={(row) => <Pill>{label("invoiceStatus", row.status)}</Pill>}
              columns={[
                { key: "status", header: "Estado", cell: (row) => <Pill>{label("invoiceStatus", row.status)}</Pill> },
                { key: "count", header: "Facturas", cell: (row) => formatNumber(row.invoice_count, 0), align: "end", numeric: true },
                { key: "amount", header: "Monto", cell: (row) => formatCurrency(toNumber(row.total_amount)), align: "end", numeric: true },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Pacientes por médico</h2>
          <span className="section-group-meta">Activos y eliminados</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            <DataList
              label="Pacientes por médico"
              rows={data.patientsByDoctor}
              rowKey={doctorKey}
              title={(row) => formatDoctorName(row.doctor_id, row.doctor_name)}
              subtitle={(row) => `${formatNumber(row.active_count, 0)} activos · ${formatNumber(row.deleted_count, 0)} eliminados`}
              status={(row) => <Pill tone="info">{formatNumber(row.total_count, 0)} total</Pill>}
              columns={[
                { key: "doctor", header: "Médico", cell: (row) => formatDoctorName(row.doctor_id, row.doctor_name) },
                { key: "total", header: "Total", cell: (row) => formatNumber(row.total_count, 0), align: "end", numeric: true },
                { key: "active", header: "Activos", cell: (row) => formatNumber(row.active_count, 0), align: "end", numeric: true },
                { key: "deleted", header: "Eliminados", cell: (row) => formatNumber(row.deleted_count, 0), align: "end", numeric: true },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Ingresos y egresos</h2>
          <span className="section-group-meta">Comparativo por responsable</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            <DataList
              label="Ingresos y egresos por médico"
              rows={data.incomeByDoctor}
              rowKey={doctorKey}
              title={(row) => formatDoctorName(row.doctor_id, row.doctor_name)}
              subtitle={(row) => `${formatNumber(row.payments_count, 0)} pagos`}
              detail={(row) => `Ingresos ${formatCurrency(toNumber(row.total_income))} · Egresos ${formatCurrency(toNumber(expenseFor(row)))}`}
              columns={[
                { key: "doctor", header: "Médico", cell: (row) => formatDoctorName(row.doctor_id, row.doctor_name) },
                { key: "payments", header: "Pagos", cell: (row) => formatNumber(row.payments_count, 0), align: "end", numeric: true },
                { key: "income", header: "Ingresos", cell: (row) => formatCurrency(toNumber(row.total_income)), align: "end", numeric: true },
                { key: "expenses", header: "Egresos", cell: (row) => formatCurrency(toNumber(expenseFor(row))), align: "end", numeric: true },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
