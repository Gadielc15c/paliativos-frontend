import type { InvoiceRecord, PaymentRecord } from "../../types/api";
import type { InvoiceContract, InvoiceDetailContract } from "../../types/contracts";
import { toNumber } from "./helpers";

const mapInvoiceItems = (
  invoice: InvoiceRecord
): InvoiceDetailContract[] =>
  invoice.items_snapshot.map((item) => ({
    id: item.item_id,
    invoiceId: invoice.id,
    description: item.description,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price),
    subtotal: toNumber(item.subtotal),
    coverage: toNumber(item.insurer_covered_amount),
    patientResponsibility: toNumber(item.patient_amount),
  }));

export const getPaidAmountForInvoice = (
  invoiceId: string,
  payments: PaymentRecord[]
) =>
  payments
    .filter((payment) => payment.invoice_id === invoiceId)
    .reduce((total, payment) => total + toNumber(payment.amount), 0);

export const invoiceAdapter = {
  toInternal: (
    invoice: InvoiceRecord,
    options?: {
      patientName?: string;
      doctorName?: string;
      paidAmount?: number;
    }
  ): InvoiceContract => {
    const paid = options?.paidAmount ?? 0;
    const total = toNumber(invoice.total);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      patientId: invoice.patient_id,
      patientName: options?.patientName,
      doctorId: invoice.doctor_id,
      doctorName: options?.doctorName,
      insuranceCompany: invoice.insurer_name || "",
      subtotal: toNumber(invoice.subtotal),
      discounts: toNumber(invoice.discounts),
      total,
      paid,
      balance: Math.max(total - paid, 0),
      insurerExpectedAmount: toNumber(invoice.insurer_expected_amount),
      patientExpectedAmount: toNumber(invoice.patient_expected_amount),
      status: invoice.status,
      issuedAt: invoice.issue_date,
      notes: invoice.notes || undefined,
      items: mapInvoiceItems(invoice),
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    };
  },
};
