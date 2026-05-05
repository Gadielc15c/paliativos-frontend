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
      <div className="invoice-list">
        {invoices.map((invoice) => (
          <button
            key={invoice.id}
            type="button"
            className={`invoice-list-item ${selectedId === invoice.id ? "selected" : ""}`}
            onClick={() => onSelect(invoice.id)}
          >
            <div className="invoice-list-top">
              <strong className="invoice-list-number">{invoice.invoiceNumber}</strong>
              <Badge variant={getStatusVariant(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
            <div className="invoice-list-patient">{invoice.patientName || invoice.patientId}</div>
            <div className="invoice-list-meta">
              <span>Doctor: {invoice.doctorName || invoice.doctorId}</span>
              <span>Total: {formatCurrency(invoice.total)}</span>
              <span className={invoice.balance > 0 ? "pending" : "paid"}>
                Saldo: {formatCurrency(invoice.balance)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
