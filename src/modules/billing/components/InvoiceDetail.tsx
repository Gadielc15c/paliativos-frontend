import { useEffect, useState } from "react";
import { Empty, Loading, Error } from "../../../components/states/StateContainers";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import type { InvoiceContract } from "../../../types/contracts";
import { formatDate, formatCurrency } from "../../../utils/format";
import "./InvoiceDetail.css";

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
  onUpdateInvoice,
  onAddInvoiceItem,
}: InvoiceDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [statusDraft, setStatusDraft] =
    useState<"draft" | "issued" | "partially_paid" | "paid" | "cancelled">("draft");
  const [notesDraft, setNotesDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) return;
    setStatusDraft(invoice.status);
    setNotesDraft(invoice.notes || "");
    setSaveMessage(null);
    setSaveError(null);
    setIsEditing(false);
    setItemDescription("");
    setItemQuantity("1");
    setItemUnitPrice("");
    setItemError(null);
  }, [invoice?.id]);

  if (isLoading) return <Loading />;
  if (isError) return <Error onRetry={onRetry} />;
  if (!invoice) return <Empty message="Selecciona una factura" />;

  const handleSave = () => {
    if (!onUpdateInvoice) return;

    const run = async () => {
      setIsSaving(true);
      setSaveMessage(null);
      setSaveError(null);
      try {
        await onUpdateInvoice({
          status: statusDraft,
          notes: notesDraft.trim() || null,
        });
        setSaveMessage("Factura actualizada.");
        setIsEditing(false);
      } catch (error) {
        setSaveError(
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
      setItemError("Describe el item.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItemError("Cantidad inválida.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setItemError("Precio unitario inválido.");
      return;
    }

    const run = async () => {
      setIsAddingItem(true);
      setItemError(null);
      try {
        await onAddInvoiceItem({
          description: itemDescription.trim(),
          quantity,
          unitPrice,
        });
        setItemDescription("");
        setItemQuantity("1");
        setItemUnitPrice("");
      } catch (error) {
        setItemError(
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
        <div className="invoice-detail-edit">
          <label>
            Descripción
            <input
              value={itemDescription}
              onChange={(event) => setItemDescription(event.target.value)}
              placeholder="Ej: Consulta médica"
            />
          </label>
          <div className="invoice-detail-edit-row">
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
          <div className="invoice-detail-edit-actions">
            <Button size="sm" onClick={handleAddItem} isLoading={isAddingItem}>
              Agregar ítem
            </Button>
          </div>
          {itemError && <p className="invoice-detail-feedback error">{itemError}</p>}
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
        <div className="summary-row">
          <h3>Gestión</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsEditing((v) => !v);
              setSaveMessage(null);
              setSaveError(null);
            }}
          >
            {isEditing ? "Cerrar edición" : "Editar factura"}
          </Button>
        </div>
        {isEditing && (
          <div className="invoice-detail-edit">
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
                <option value="draft">draft</option>
                <option value="issued">issued</option>
                <option value="partially_paid">partially_paid</option>
                <option value="paid">paid</option>
                <option value="cancelled">cancelled</option>
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
            <div className="invoice-detail-edit-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStatusDraft(invoice.status);
                  setNotesDraft(invoice.notes || "");
                  setSaveError(null);
                  setSaveMessage(null);
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
        {saveMessage && <p className="invoice-detail-feedback success">{saveMessage}</p>}
        {saveError && <p className="invoice-detail-feedback error">{saveError}</p>}
      </div>

      <div className="invoice-detail-meta">
        <span className="meta-item">Creado: {formatDate(invoice.createdAt)}</span>
        <span className="meta-item">Actualizado: {formatDate(invoice.updatedAt)}</span>
      </div>
    </div>
  );
}
