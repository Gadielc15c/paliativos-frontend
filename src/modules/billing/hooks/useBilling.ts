import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  billingEndpoints,
  doctorsEndpoints,
  financeEndpoints,
  patientsEndpoints,
} from "../../../services/endpoints";
import {
  getPaidAmountForInvoice,
  invoiceAdapter,
} from "../../../services/adapters";
import type { InvoiceContract, InvoiceDetailContract } from "../../../types/contracts";
import type { ApiError } from "../../../types/common";

const createNameLookup = (items: { id: string; full_name: string }[]) =>
  Object.fromEntries(items.map((item) => [item.id, item.full_name]));

export function useBillingQuery(
  page: number = 1,
  limit: number = 50,
  patientId?: string | null
): UseQueryResult<InvoiceContract[], ApiError> {
  return useQuery({
    queryKey: ["billing-invoices", page, limit, patientId],
    queryFn: async () => {
      try {
        const [invoicesPage, paymentsPage, patientsPage, doctorsPage] =
          await Promise.all([
            billingEndpoints.listInvoices(page, limit, patientId || undefined),
            financeEndpoints.listPayments(1, 100),
            patientsEndpoints.list(1, 500),
            doctorsEndpoints.list(1, 500, true),
          ]);

        const patientsById = createNameLookup(patientsPage.items);
        const doctorsById = createNameLookup(doctorsPage.items);

        return invoicesPage.items.map((invoice) =>
          invoiceAdapter.toInternal(invoice, {
            patientName: patientsById[invoice.patient_id],
            doctorName: doctorsById[invoice.doctor_id],
            paidAmount: getPaidAmountForInvoice(invoice.id, paymentsPage.items),
          })
        );
      } catch (error) {
        throw error as ApiError;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoiceDetail(
  invoiceId: string | null
): UseQueryResult<InvoiceContract | null, ApiError> {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      try {
        const [invoice, paymentsPage, patientsPage, doctorsPage] = await Promise.all([
          billingEndpoints.getInvoice(invoiceId),
          financeEndpoints.listPayments(1, 100, invoiceId),
          patientsEndpoints.list(1, 500),
          doctorsEndpoints.list(1, 500, true),
        ]);

        const patientsById = createNameLookup(patientsPage.items);
        const doctorsById = createNameLookup(doctorsPage.items);

        return invoiceAdapter.toInternal(invoice, {
          patientName: patientsById[invoice.patient_id],
          doctorName: doctorsById[invoice.doctor_id],
          paidAmount: getPaidAmountForInvoice(invoice.id, paymentsPage.items),
        });
      } catch (error) {
        throw error as ApiError;
      }
    },
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoiceDetails(
  invoiceId: string | null
): UseQueryResult<InvoiceDetailContract[], ApiError> {
  return useQuery({
    queryKey: ["invoice-details", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      try {
        const invoice = await billingEndpoints.getInvoice(invoiceId);
        return invoiceAdapter.toInternal(invoice).items;
      } catch (error) {
        throw error as ApiError;
      }
    },
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}
