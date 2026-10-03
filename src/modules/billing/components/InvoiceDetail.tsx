import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Pill from "../../../components/common/Pill";
import Button from "../../../components/common/Button";
import type { InvoiceContract } from "../../../types/contracts";
import { formatDate, formatCurrency } from "../../../utils/format";
import "./InvoiceDetail.css";
import { label } from "../../../utils/labels";

interface InvoiceDetailProps {
  invoice: InvoiceContract | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onUpdateInvoice?: (payload: {
    status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
    notes: string | null;
  }) => Promise<void>;
  onAddInvoiceItem?: (payload: {
    description: string;
    quantity: number;
    unitPrice: number;
  }) => Promise<void>;
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

export default function InvoiceDetail({
  invoice,
  isLoading,
  isError,
  onRetry,
  onUpdateInvoice,
  onAddInvoiceItem,
}: InvoiceDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [statusDraft, setStatusDraft] =
    useState<"draft" | "issued" | "partially_paid" | "paid" | "cancelled">("draft");
  const [notesDraft, setNotesDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setStatusDraft(invoice.status);
    setNotesDraft(invoice.notes || "");
    setIsEditing(false);
    setItemDescription("");
    setItemQuantity("1");
    setItemUnitPrice("");
  }, [invoice?.id]);

  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!invoice) return <Empty message="Elige una factura de la lista para ver su detalle y registrar pagos." />;

  const handleSave = () => {
    if (!onUpdateInvoice) return;

    const run = async () => {
      setIsSaving(true);
      try {
        await onUpdateInvoice({
          status: statusDraft,
          notes: notesDraft.trim() || null,
        });
        toast.success("Factura actualizada.");
        setIsEditing(false);
      } catch (error) {
        toast.error(
          error instanceof globalThis.Error
            ? error.message
            : "No se pudo actualizar factura."
        );
      } finally {
        setIsSaving(false);
      }
    };

    void run();
  };

  const handleAddItem = () => {
    if (!onAddInvoiceItem) return;
    const quantity = Number(itemQuantity);
    const unitPrice = Number(itemUnitPrice);
    if (!itemDescription.trim()) {
      toast.error("Describe el item.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Cantidad inválida.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast.error("Precio unitario inválido.");
      return;
    }

    const run = async () => {
      setIsAddingItem(true);
      try {
        await onAddInvoiceItem({
          description: itemDescription.trim(),
          quantity,
          unitPrice,
        });
        toast.success("Item agregado.");
        setItemDescription("");
        setItemQuantity("1");
        setItemUnitPrice("");
      } catch (error) {
        toast.error(
          error instanceof globalThis.Error ? error.message : "No se pudo agregar item."
        );
      } finally {
        setIsAddingItem(false);
      }
    };

    void run();
  };

  return (
    <div className="invoice-detail">
      <div className="invoice-detail-header">
        <div className="invoice-detail-heading">
          <span className="invoice-detail-kicker">Factura {invoice.invoiceNumber}</span>
          <h1 className="invoice-detail-number">{invoice.patientName || invoice.patientId}</h1>
        </div>
        <Pill tone={getStatusVariant(invoice.status)}>
          {label("invoiceStatus", invoice.status)}
        </Pill>
      </div>

      <div className="invoice-detail-info">
        <div className="invoice-field">
          <span className="label">Paciente</span>
          <span className="value">{invoice.patientName || invoice.patientId}</span>
        </div>
        <div className="invoice-field">
          <span className="label">Doctor</span>
          <span className="value">
            {invoice.doctorName || `Sin nombre (ID: ${invoice.doctorId})`}
          </span>
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
        <div className="invoice-detail-edit form-stack">
          <label>
            Descripción
            <input
              value={itemDescription}
              onChange={(event) => setItemDescription(event.target.value)}
              placeholder="Ej: Consulta médica"
            />
          </label>
          <div className="invoice-detail-edit-row form-grid">
            <label>
              Cantidad
              <input
                type="number"
                min={1}
                step={1}
                value={itemQuantity}
                onChange={(event) => setItemQuantity(event.target.value)}
              />
            </label>
            <label>
              Precio unitario
              <input
                type="number"
                min={0}
                step="0.01"
                value={itemUnitPrice}
                onChange={(event) => setItemUnitPrice(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <div className="invoice-detail-edit-actions form-actions">
            <Button size="sm" className="glow-border" onClick={handleAddItem} isLoading={isAddingItem}>
              Agregar ítem
            </Button>
          </div>

        </div>
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

      <div className="invoice-detail-summary">
        <div className="invoice-section-head">
          <h3>Gestión</h3>
          <Button
            size="sm"
            variant="tinted"
            onClick={() => {
              setIsEditing((v) => !v);
            }}
          >
            {isEditing ? "Cerrar edición" : "Editar factura"}
          </Button>
        </div>
        {isEditing && (
          <div className="invoice-detail-edit form-stack">
            <label>
              Estado
              <select
                value={statusDraft}
                onChange={(event) =>
                  setStatusDraft(
                    event.target.value as
                      | "draft"
                      | "issued"
                      | "partially_paid"
                      | "paid"
                      | "cancelled"
                  )
                }
              >
                <option value="draft">{label("invoiceStatus", "draft")}</option>
                <option value="issued">{label("invoiceStatus", "issued")}</option>
                <option value="partially_paid">{label("invoiceStatus", "partially_paid")}</option>
                <option value="paid">{label("invoiceStatus", "paid")}</option>
                <option value="cancelled">{label("invoiceStatus", "cancelled")}</option>
              </select>
            </label>
            <label>
              Notas
              <textarea
                rows={3}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
              />
            </label>
            <div className="invoice-detail-edit-actions form-actions">
              <Button
                size="sm"
                variant="gray"
                onClick={() => {
                  setStatusDraft(invoice.status);
                  setNotesDraft(invoice.notes || "");
                }}
              >
                Revertir
              </Button>
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                Guardar
              </Button>
            </div>
          </div>
        )}


      </div>

      <div className="invoice-detail-meta">
        <span className="meta-item">Creado: {formatDate(invoice.createdAt)}</span>
        <span className="meta-item">Actualizado: {formatDate(invoice.updatedAt)}</span>
      </div>
    </div>
  );
}
