import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBillingQuery, useInvoiceDetail } from "../hooks";
import { InvoiceTable, InvoiceDetail } from "../components";
import { billingEndpoints } from "../../../services/endpoints";
import Pill from "../../../components/common/Pill";
import SegmentedControl from "../../../components/common/SegmentedControl";
import FinancePage from "../../finance/pages/FinancePage";
import { ChevronLeft } from "lucide-react";
import type { InvoiceContract } from "../../../types/contracts";
import "./BillingPage.css";

type BillingTab = "invoices" | "movimientos";
const OVERDUE_DAYS = 30;
/** Issued or partially paid, issued more than 30 days ago (same rule as the backend's unpaid_invoices alert). */
export const isOverdue = (i: InvoiceContract, now = Date.now()) =>
  (i.status === "issued" || i.status === "partially_paid") && now - Date.parse(i.issuedAt) > OVERDUE_DAYS * 86400000;

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: BillingTab = searchParams.get("tab") === "movimientos" ? "movimientos" : "invoices";
  const patientIdFilter = searchParams.get("patientId");
  const invoiceIdFilter = searchParams.get("invoiceId");
  const overdueOnly = searchParams.get("status") === "overdue";
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const { data: invoices, isLoading: invoicesLoading, isError: invoicesError, refetch: refetchInvoices } = useBillingQuery(1, 50, patientIdFilter);
  const { data: selectedInvoice, isLoading: invoiceLoading, isError: invoiceError, refetch: refetchInvoice } = useInvoiceDetail(selectedInvoiceId);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return invoices;
    return invoices
      .filter((invoice) => !patientIdFilter || invoice.patientId === patientIdFilter)
      .filter((invoice) => !overdueOnly || isOverdue(invoice));
  }, [invoices, patientIdFilter, overdueOnly]);

  useEffect(() => {
    if (invoiceIdFilter) setSelectedInvoiceId(invoiceIdFilter);
  }, [invoiceIdFilter]);

  const handleUpdateInvoice = async (payload: { status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled"; notes: string | null }) => {
    if (!selectedInvoiceId) return;
    await billingEndpoints.updateInvoice(selectedInvoiceId, payload);
    await Promise.all([refetchInvoice(), refetchInvoices()]);
  };

  const handleAddInvoiceItem = async (payload: { description: string; quantity: number; unitPrice: number }) => {
    if (!selectedInvoiceId) return;
    const subtotal = payload.quantity * payload.unitPrice;
    await billingEndpoints.addItem(selectedInvoiceId, {
      description: payload.description, quantity: payload.quantity, unit_price: payload.unitPrice,
      insurer_covered_amount: 0, patient_amount: subtotal,
    });
    await billingEndpoints.recalculateInvoice(selectedInvoiceId);
    await Promise.all([refetchInvoice(), refetchInvoices()]);
  };

  const invoiceCount = filteredInvoices?.length ?? 0;
  const detailOpen = tab === "invoices" && !!selectedInvoiceId;

  return (
    <div className={`billing-screen ${detailOpen ? "detail-open" : ""}`}>
      <header className="billing-screen-head">
        <h1 className="billing-list-title">Facturación</h1>
        <SegmentedControl<BillingTab> className="billing-tabs" label="Secciones de facturación" value={tab}
          onChange={(v) => { setSelectedInvoiceId(null); setParam("tab", v === "movimientos" ? "movimientos" : null); }}
          segments={[{ value: "invoices", label: "Facturas" }, { value: "movimientos", label: "Movimientos" }]} />
      </header>

      {tab === "movimientos" ? <FinancePage embedded /> : (
        <div className={`billing-page ${detailOpen ? "detail-open" : ""}`}>
          <aside className="billing-list-column" aria-label="Listado de facturas">
            <div className="billing-list-head">
              {invoiceCount > 0 && <span className="billing-list-count">{invoiceCount} {invoiceCount === 1 ? "factura" : "facturas"}</span>}
              {(patientIdFilter || overdueOnly) && (
                <div className="billing-filter-banner" aria-label="Filtros activos">
                  {overdueOnly && <Pill tone="warning" removable onRemove={() => setParam("status", null)} removeLabel="Quitar filtro de vencidas">{`Vencidas (+${OVERDUE_DAYS} días)`}</Pill>}
                  {patientIdFilter && <Pill tone="info" removable onRemove={() => setParam("patientId", null)} removeLabel="Quitar filtro de paciente">Un paciente</Pill>}
                </div>
              )}
            </div>
            <InvoiceTable
              invoices={filteredInvoices}
              isLoading={invoicesLoading}
              isError={invoicesError}
              selectedId={selectedInvoiceId}
              onSelect={setSelectedInvoiceId}
              onRetry={refetchInvoices}
              emptyMessage={overdueOnly ? `No hay facturas vencidas: todo lo emitido hace más de ${OVERDUE_DAYS} días está cobrado.` : patientIdFilter ? "Este paciente aún no tiene facturas. Emítela desde su ficha (menú … › Emitir factura)." : undefined}
            />
          </aside>

          <section className="billing-detail-column" aria-label="Detalle de factura">
            <button type="button" className="page-header-back billing-back" onClick={() => setSelectedInvoiceId(null)}>
              <ChevronLeft size={20} aria-hidden="true" />
              <span>Facturas</span>
            </button>
            <InvoiceDetail
              invoice={selectedInvoice}
              isLoading={invoiceLoading}
              isError={invoiceError}
              onRetry={refetchInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onAddInvoiceItem={handleAddInvoiceItem}
            />
          </section>
        </div>
      )}
    </div>
  );
}
