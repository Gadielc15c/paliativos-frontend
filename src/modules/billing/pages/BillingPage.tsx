import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBillingQuery, useInvoiceDetail } from "../hooks";
import { InvoiceTable, InvoiceDetail } from "../components";
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
        />
      </div>
    </div>
  );
}
