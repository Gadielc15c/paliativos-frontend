// Endpoint functions para Reports
import { httpClient } from "../http";
import type {
  ExpensesByDoctorRecord,
  FinancialSummaryRecord,
  IncomeByDoctorRecord,
  InvoicesByStatusRecord,
  PatientsByDoctorRecord,
} from "../../types/api";

export const reportsEndpoints = {
  getPatientsByDoctor: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await httpClient.get<PatientsByDoctorRecord[]>(
      "/reports/patients-by-doctor",
      {
        params: {
          doctor_id: params?.doctorId,
          from: params?.from,
          to: params?.to,
        },
      }
    );
    return response.data;
  },

  getIncomeByDoctor: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await httpClient.get<IncomeByDoctorRecord[]>(
      "/reports/income-by-doctor",
      {
        params: {
          doctor_id: params?.doctorId,
          from: params?.from,
          to: params?.to,
        },
      }
    );
    return response.data;
  },

  getExpensesByDoctor: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await httpClient.get<ExpensesByDoctorRecord[]>(
      "/reports/expenses-by-doctor",
      {
        params: {
          doctor_id: params?.doctorId,
          from: params?.from,
          to: params?.to,
        },
      }
    );
    return response.data;
  },

  getFinancialSummary: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await httpClient.get<FinancialSummaryRecord>(
      "/reports/financial-summary",
      {
        params: {
          doctor_id: params?.doctorId,
          from: params?.from,
          to: params?.to,
        },
      }
    );
    return response.data;
  },

  getInvoicesByStatus: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await httpClient.get<InvoicesByStatusRecord[]>(
      "/reports/invoices-by-status",
      {
        params: {
          doctor_id: params?.doctorId,
          from: params?.from,
          to: params?.to,
        },
      }
    );
    return response.data;
  },

  getDashboard: async (params?: {
    doctorId?: string;
    from?: string;
    to?: string;
  }) => {
    const [summary, invoicesByStatus, patientsByDoctor, incomeByDoctor, expensesByDoctor] =
      await Promise.all([
        reportsEndpoints.getFinancialSummary(params),
        reportsEndpoints.getInvoicesByStatus(params),
        reportsEndpoints.getPatientsByDoctor(params),
        reportsEndpoints.getIncomeByDoctor(params),
        reportsEndpoints.getExpensesByDoctor(params),
      ]);

    return {
      summary,
      invoicesByStatus,
      patientsByDoctor,
      incomeByDoctor,
      expensesByDoctor,
    };
  },
};
