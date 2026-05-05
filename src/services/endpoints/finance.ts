// Endpoint functions para Finance
import { httpClient } from "../http";
import type {
  ExpenseRecord,
  PageResponse,
  PaymentRecord,
} from "../../types/api";

export const financeEndpoints = {
  listPayments: async (page = 1, pageSize = 100, invoiceId?: string) => {
    const response = await httpClient.get<PageResponse<PaymentRecord>>("/payments", {
      params: {
        page,
        page_size: pageSize,
        invoice_id: invoiceId,
      },
    });
    return response.data;
  },

  listExpenses: async (page = 1, pageSize = 100, doctorId?: string) => {
    const response = await httpClient.get<PageResponse<ExpenseRecord>>("/expenses", {
      params: {
        page,
        page_size: pageSize,
        doctor_id: doctorId,
      },
    });
    return response.data;
  },

  createPayment: async (
    data: {
      invoice_id: string;
      payer_type: string;
      amount: number;
      payment_date?: string;
      payment_method?: string | null;
      reference?: string | null;
      notes?: string | null;
    }
  ) => {
    const response = await httpClient.post<PaymentRecord>("/payments", data);
    return response.data;
  },

  createExpense: async (
    data: {
      doctor_id?: string | null;
      description: string;
      category: string;
      amount: number;
      expense_date?: string;
      notes?: string | null;
    }
  ) => {
    const response = await httpClient.post<ExpenseRecord>("/expenses", data);
    return response.data;
  },
};
