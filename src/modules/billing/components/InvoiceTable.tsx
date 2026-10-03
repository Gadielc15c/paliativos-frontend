import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Pill from "../../../components/common/Pill";
import DataList from "../../../components/common/DataList";
import type { InvoiceContract } from "../../../types/contracts";
import { formatCurrency } from "../../../utils/format";
import "./InvoiceTable.css";
import { label } from "../../../utils/labels";

interface InvoiceTableProps {
  invoices: InvoiceContract[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  emptyMessage?: string;
}

const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" => {
  switch (status) {
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
    case "draft":
      return "info";
    case "cancelled":
      return "danger";
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
  emptyMessage,
}: InvoiceTableProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!invoices || invoices.length === 0) return <Empty message={emptyMessage ?? "Aún no hay facturas. Se emiten desde la ficha del paciente (menú … › Emitir factura)."} />;

  return (
    <div className="invoice-table-container">
      <DataList
        label="Facturas"
        layout="cards"
        rows={invoices}
        rowKey={(invoice) => invoice.id}
        selectedKey={selectedId}
        onRowClick={(invoice) => onSelect(invoice.id)}
        title={(invoice) => invoice.patientName || invoice.patientId}
        subtitle={(invoice) => `${invoice.invoiceNumber} · ${invoice.doctorName || invoice.doctorId}`}
        detail={(invoice) => (
          <span className="invoice-list-amounts">
            <span>{formatCurrency(invoice.total)}</span>
            <span className={invoice.balance > 0 ? "pending" : "paid"}>
              {invoice.balance > 0 ? `Saldo ${formatCurrency(invoice.balance)}` : "Sin saldo"}
            </span>
          </span>
        )}
        status={(invoice) => <Pill tone={getStatusVariant(invoice.status)}>{label("invoiceStatus", invoice.status)}</Pill>}
        columns={[]}
      />
    </div>
  );
}
