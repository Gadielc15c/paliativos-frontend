import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import PageHeader from "../../../components/common/PageHeader";
import Pill from "../../../components/common/Pill";
import { RefreshCw } from "lucide-react";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { toNumber } from "../../../services/adapters";
import { financeEndpoints } from "../../../services/endpoints";
import { formatCurrency, formatDate } from "../../../utils/format";
import { label } from "../../../utils/labels";

/** Movimientos (pagos y egresos). Rendered as a tab inside Facturación (`embedded`). */
export default function FinancePage({ embedded = false }: { embedded?: boolean }) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: async () => {
      const [paymentsPage, expensesPage] = await Promise.all([
        financeEndpoints.listPayments(1, 100),
        financeEndpoints.listExpenses(1, 100),
      ]);

      return {
        payments: paymentsPage.items,
        expenses: expensesPage.items,
      };
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <Error message="No se pudieron cargar movimientos." onRetry={() => void refetch()} />;
  }

  const incomeTotal = data.payments.reduce(
    (total, payment) => total + toNumber(payment.amount),
    0
  );
  const expenseTotal = data.expenses.reduce(
    (total, expense) => total + toNumber(expense.amount),
    0
  );

  return (
    <div className={embedded ? "data-screen finance-embedded" : "data-screen"}>
      {embedded ? (
        <div className="section-group-header finance-embedded-head">
          <span className="section-group-meta">Pagos recibidos y egresos de la clínica, para el control diario.</span>
          <Button variant="gray" onClick={() => void refetch()} isLoading={isFetching}>
            <RefreshCw size={18} aria-hidden="true" />
            <span>Actualizar</span>
          </Button>
        </div>
      ) : (
      <PageHeader
          eyebrow="Operación financiera"
          title="Movimientos"
          description="Pagos y egresos consolidados para el control diario."
          actions={
            <Button variant="gray" onClick={() => void refetch()} isLoading={isFetching}>
              <RefreshCw size={18} aria-hidden="true" />
              <span>Actualizar</span>
            </Button>
          }
        />
      )}

      <section className="data-stat-grid" aria-label="Totales">
        <article className="data-stat-card">
          <span className="data-stat-label">Ingresos</span>
          <strong className="data-stat-value">{formatCurrency(incomeTotal)}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Egresos</span>
          <strong className="data-stat-value">{formatCurrency(expenseTotal)}</strong>
        </article>
        <article className="data-stat-card is-wide">
          <span className="data-stat-label">Neto</span>
          <strong className="data-stat-value">{formatCurrency(incomeTotal - expenseTotal)}</strong>
        </article>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Pagos</h2>
          <span className="section-group-meta">Últimos ingresos registrados</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            {data.payments.length === 0 ? (
              <Empty message="Aún no hay pagos. Se registran desde el detalle de cada factura." />
            ) : (
              <DataList
                label="Pagos"
                rows={data.payments}
                rowKey={(p) => p.id}
                title={(p) => formatCurrency(toNumber(p.amount))}
                subtitle={(p) => `${formatDate(p.payment_date)} · ${label("payerType", p.payer_type)}`}
                status={(p) => <Pill tone="success">{p.payment_method ? label("paymentMethod", p.payment_method) : "Pago"}</Pill>}
                columns={[
                  { key: "date", header: "Fecha", cell: (p) => formatDate(p.payment_date), width: "18%" },
                  { key: "invoice", header: "Factura", cell: (p) => <span className="cell-code" title={p.invoice_id}>{p.invoice_id}</span> },
                  { key: "payer", header: "Pagador", cell: (p) => label("payerType", p.payer_type), width: "18%" },
                  { key: "amount", header: "Monto", cell: (p) => formatCurrency(toNumber(p.amount)), align: "end", numeric: true, width: "20%" },
                ]}
              />
            )}
          </div>
        </div>
      </section>

      <section className="section-group">
        <div className="section-group-header">
          <h2 className="section-group-title">Egresos</h2>
          <span className="section-group-meta">Gasto operativo por categoría</span>
        </div>
        <div className="data-card">
          <div className="data-card-body">
            {data.expenses.length === 0 ? (
              <Empty message="Aún no hay egresos registrados en este período." />
            ) : (
              <DataList
                label="Egresos"
                rows={data.expenses}
                rowKey={(e) => e.id}
                title={(e) => e.description}
                subtitle={(e) => `${e.category} · ${formatDate(e.expense_date)}`}
                detail={(e) => formatCurrency(toNumber(e.amount))}
                columns={[
                  { key: "date", header: "Fecha", cell: (e) => formatDate(e.expense_date), width: "18%" },
                  { key: "description", header: "Descripción", cell: (e) => e.description },
                  { key: "category", header: "Categoría", cell: (e) => e.category, width: "20%" },
                  { key: "amount", header: "Monto", cell: (e) => formatCurrency(toNumber(e.amount)), align: "end", numeric: true, width: "20%" },
                ]}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
