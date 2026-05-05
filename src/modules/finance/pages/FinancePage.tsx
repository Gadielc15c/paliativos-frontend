import { useQuery } from "@tanstack/react-query";
import Button from "../../../components/common/Button";
import { Empty, Error, Loading } from "../../../components/states/StateContainers";
import { toNumber } from "../../../services/adapters";
import { financeEndpoints } from "../../../services/endpoints";
import { formatCurrency, formatDate } from "../../../utils/format";

export default function FinancePage() {
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
    <div className="data-screen">
      <section className="data-screen-header">
        <div className="data-screen-copy">
          <span className="data-screen-eyebrow">Operación financiera</span>
          <h1>Movimientos contables</h1>
          <p className="data-screen-description">
            Consolidado de pagos y egresos para control diario.
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
          <span className="data-stat-label">Ingresos</span>
          <strong className="data-stat-value">{formatCurrency(incomeTotal)}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Egresos</span>
          <strong className="data-stat-value">{formatCurrency(expenseTotal)}</strong>
        </article>
        <article className="data-stat-card">
          <span className="data-stat-label">Neto</span>
          <strong className="data-stat-value">
            {formatCurrency(incomeTotal - expenseTotal)}
          </strong>
        </article>
      </section>

      <section className="data-split">
        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Pagos</h2>
              <p className="data-card-subtitle">Últimos ingresos registrados</p>
            </div>
          </header>
          <div className="data-card-body">
            {data.payments.length === 0 ? (
              <Empty message="Sin pagos registrados." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Factura</th>
                    <th>Payer</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td className="data-table-mono">{payment.invoice_id}</td>
                      <td>{payment.payer_type}</td>
                      <td className="data-table-mono">
                        {formatCurrency(toNumber(payment.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="data-card">
          <header className="data-card-header">
            <div>
              <h2 className="data-card-title">Egresos</h2>
              <p className="data-card-subtitle">Gasto operativo por categoría</p>
            </div>
          </header>
          <div className="data-card-body">
            {data.expenses.length === 0 ? (
              <Empty message="Sin egresos registrados." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expense_date)}</td>
                      <td>{expense.description}</td>
                      <td>{expense.category}</td>
                      <td className="data-table-mono">
                        {formatCurrency(toNumber(expense.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
