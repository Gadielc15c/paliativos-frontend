// Endpoint functions para Billing
import { httpClient } from "../http";
import type {
  InvoiceItemRecord,
  InvoiceRecord,
  PageResponse,
} from "../../types/api";

export const billingEndpoints = {
  listInvoices: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<InvoiceRecord>>("/invoices", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getInvoice: async (id: string) => {
    const response = await httpClient.get<InvoiceRecord>(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (
    data: {
      patient_id: string;
      episode_id?: string | null;
      issue_date?: string;
      insurer_name?: string | null;
      discounts?: number;
      notes?: string | null;
    }
  ) => {
    const response = await httpClient.post<InvoiceRecord>("/invoices", data);
    return response.data;
  },

  updateInvoice: async (
    id: string,
    data: Partial<{
      episode_id: string | null;
      issue_date: string;
      insurer_name: string | null;
      discounts: number;
      notes: string | null;
      status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
    }>
  ) => {
    const response = await httpClient.patch<InvoiceRecord>(`/invoices/${id}`, data);
    return response.data;
  },

  deleteInvoice: async (id: string) => {
    const response = await httpClient.delete<InvoiceRecord>(`/invoices/${id}`);
    return response.data;
  },

  addItem: async (
    invoiceId: string,
    detail: {
      description: string;
      quantity: number;
      unit_price: number;
      insurer_covered_amount: number;
      patient_amount: number;
    }
  ) => {
    const response = await httpClient.post<InvoiceItemRecord>(
      `/invoices/${invoiceId}/items`,
      detail
    );
    return response.data;
  },

  updateItem: async (
    itemId: string,
    detail: Partial<{
      description: string;
      quantity: number;
      unit_price: number;
      insurer_covered_amount: number;
      patient_amount: number;
    }>
  ) => {
    const response = await httpClient.patch<InvoiceItemRecord>(
      `/invoice-items/${itemId}`,
      detail
    );
    return response.data;
  },

  deleteItem: async (itemId: string) => {
    await httpClient.delete(`/invoice-items/${itemId}`);
  },

  recalculateInvoice: async (invoiceId: string) => {
    const response = await httpClient.post<InvoiceRecord>(
      `/invoices/${invoiceId}/recalculate`,
      {}
    );
    return response.data;
  },
};
