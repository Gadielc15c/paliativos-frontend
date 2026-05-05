import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBillingQuery, useInvoiceDetail } from "../hooks";
import { InvoiceTable, InvoiceDetail } from "../components";
import { billingEndpoints } from "../../../services/endpoints";
import "./BillingPage.css";

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const patientIdFilter = searchParams.get("patientId");
  const invoiceIdFilter = searchParams.get("invoiceId");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Fetch invoices list
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
    refetch: refetchInvoices,
  } = useBillingQuery(1, 50, patientIdFilter);

  // Fetch selected invoice detail
  const {
    data: selectedInvoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
    refetch: refetchInvoice,
  } = useInvoiceDetail(selectedInvoiceId);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
  };

  const filteredInvoices = useMemo(() => {
    if (!invoices) return invoices;
    if (!patientIdFilter) return invoices;
    return invoices.filter((invoice) => invoice.patientId === patientIdFilter);
  }, [invoices, patientIdFilter]);

  useEffect(() => {
    if (invoiceIdFilter) {
      setSelectedInvoiceId(invoiceIdFilter);
    }
  }, [invoiceIdFilter]);

  const handleUpdateInvoice = async (payload: {
    status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
    notes: string | null;
  }) => {
    if (!selectedInvoiceId) return;
    await billingEndpoints.updateInvoice(selectedInvoiceId, payload);
    await Promise.all([refetchInvoice(), refetchInvoices()]);
  };

  const handleAddInvoiceItem = async (payload: {
    description: string;
    quantity: number;
    unitPrice: number;
  }) => {
    if (!selectedInvoiceId) return;
    const subtotal = payload.quantity * payload.unitPrice;
    await billingEndpoints.addItem(selectedInvoiceId, {
      description: payload.description,
      quantity: payload.quantity,
      unit_price: payload.unitPrice,
      insurer_covered_amount: 0,
      patient_amount: subtotal,
    });
    await billingEndpoints.recalculateInvoice(selectedInvoiceId);
    await Promise.all([refetchInvoice(), refetchInvoices()]);
  };

  return (
    <div className="billing-page">
      <div className="billing-list-column">
        {patientIdFilter && (
          <div className="billing-filter-banner">
            Filtro activo por paciente: <strong>{patientIdFilter}</strong>
          </div>
        )}
        <InvoiceTable
          invoices={filteredInvoices}
          isLoading={invoicesLoading}
          isError={invoicesError}
          selectedId={selectedInvoiceId}
          onSelect={handleSelectInvoice}
          onRetry={refetchInvoices}
        />
      </div>

      <div className="billing-detail-column">
        <InvoiceDetail
          invoice={selectedInvoice}
          isLoading={invoiceLoading}
          isError={invoiceError}
          onRetry={refetchInvoice}
          onUpdateInvoice={handleUpdateInvoice}
          onAddInvoiceItem={handleAddInvoiceItem}
        />
      </div>
    </div>
  );
}
