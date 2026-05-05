import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Badge from "../../../components/common/Badge";
import type { InvoiceContract } from "../../../types/contracts";
import { formatCurrency } from "../../../utils/format";
import "./InvoiceTable.css";

interface InvoiceTableProps {
  invoices: InvoiceContract[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

const getStatusVariant = (status: string): "success" | "warning" | "error" | "info" => {
  switch (status) {
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
    case "draft":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "info";
  }
};

export default function InvoiceTable({
  invoices,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onRetry,
}: InvoiceTableProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!invoices || invoices.length === 0) return <Empty message="Sin facturas" />;

  return (
    <div className="invoice-table-container">
      <div className="invoice-table-header">
        <h2>Facturas ({invoices.length})</h2>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Factura</th>
            <th>Paciente</th>
            <th>Doctor</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className={`invoice-row ${selectedId === invoice.id ? "selected" : ""}`}
              onClick={() => onSelect(invoice.id)}
            >
              <td className="mono">{invoice.invoiceNumber}</td>
              <td>{invoice.patientName || invoice.patientId}</td>
              <td>{invoice.doctorName || invoice.doctorId}</td>
              <td className="mono">{formatCurrency(invoice.total)}</td>
              <td>
                <Badge variant={getStatusVariant(invoice.status)}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </td>
              <td className={`mono ${invoice.balance > 0 ? "pending" : "paid"}`}>
                {formatCurrency(invoice.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
