import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Badge from "../../../components/common/Badge";
import type { InvoiceContract } from "../../../types/contracts";
import { formatDate, formatCurrency } from "../../../utils/format";
import "./InvoiceDetail.css";

interface InvoiceDetailProps {
  invoice: InvoiceContract | null | undefined;
  isLoading: boolean;
  isError: boolean;
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

export default function InvoiceDetail({
  invoice,
  isLoading,
  isError,
  onRetry,
}: InvoiceDetailProps) {
  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!invoice) return <Empty message="Selecciona una factura" />;

  return (
    <div className="invoice-detail">
      <div className="invoice-detail-header">
        <h1 className="invoice-detail-number">{invoice.invoiceNumber}</h1>
        <Badge variant={getStatusVariant(invoice.status)}>
          {invoice.status.toUpperCase()}
        </Badge>
      </div>

      <div className="invoice-detail-info">
        <div className="invoice-field">
          <span className="label">Paciente</span>
          <span className="value">{invoice.patientName || invoice.patientId}</span>
        </div>
        <div className="invoice-field">
          <span className="label">Doctor</span>
          <span className="value">{invoice.doctorName || invoice.doctorId}</span>
        </div>
        <div className="invoice-field">
          <span className="label">Aseguradora</span>
          <span className="value">{invoice.insuranceCompany || "—"}</span>
        </div>
        <div className="invoice-field">
          <span className="label">Emitida</span>
          <span className="value">{formatDate(invoice.issuedAt)}</span>
        </div>
      </div>

      <div className="invoice-detail-summary">
        <h3>Resumen</h3>
        <div className="summary-row">
          <span className="summary-label">Subtotal</span>
          <span className="summary-value mono">{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Pagado</span>
          <span className="summary-value mono success">{formatCurrency(invoice.paid)}</span>
        </div>
        <div className="summary-row total">
          <span className="summary-label">Saldo</span>
          <span className="summary-value mono">{formatCurrency(invoice.balance)}</span>
        </div>
      </div>

      <div className="invoice-detail-summary">
        <h3>Ítems</h3>
        {invoice.items.length === 0 ? (
          <p>Sin ítems registrados.</p>
        ) : (
          invoice.items.map((item) => (
            <div className="summary-row" key={item.id}>
              <span className="summary-label">{item.description}</span>
              <span className="summary-value mono">{formatCurrency(item.subtotal)}</span>
            </div>
          ))
        )}
      </div>

      <div className="invoice-detail-meta">
        <span className="meta-item">Creado: {formatDate(invoice.createdAt)}</span>
        <span className="meta-item">Actualizado: {formatDate(invoice.updatedAt)}</span>
      </div>
    </div>
  );
}
