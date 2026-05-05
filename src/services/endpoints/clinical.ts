import { httpClient } from "../http";
import type {
  ConsultationRecord,
  DiagnosticRecord,
  PrescriptionRecord,
} from "../../types/api";

type PrescriptionStatus = "active" | "suspended" | "completed" | "discontinued";

export const consultationsEndpoints = {
  create: async (data: {
    patient_id: string;
    date?: string;
    reason?: string | null;
    notes?: string | null;
  }) => {
    const response = await httpClient.post<ConsultationRecord>("/consultations", data);
    return response.data;
  },
  listByPatient: async (patientId: string) => {
    const response = await httpClient.get<ConsultationRecord[]>(
      `/consultations/${patientId}`
    );
    return response.data;
  },
};

export const diagnosticsEndpoints = {
  create: async (data: {
    patient_id: string;
    date?: string;
    diagnosis: string;
    notes?: string | null;
  }) => {
    const response = await httpClient.post<DiagnosticRecord>("/diagnostics", data);
    return response.data;
  },
  listByPatient: async (patientId: string) => {
    const response = await httpClient.get<DiagnosticRecord[]>(
      `/diagnostics/${patientId}`
    );
    return response.data;
  },
};

export const prescriptionsEndpoints = {
  create: async (data: {
    patient_id: string;
    date?: string;
    medication: string;
    dosage?: string | null;
    instructions?: string | null;
    notes?: string | null;
  }) => {
    const response = await httpClient.post<PrescriptionRecord>("/prescriptions", data);
    return response.data;
  },
  listByPatient: async (patientId: string) => {
    const response = await httpClient.get<PrescriptionRecord[]>(
      `/prescriptions/${patientId}`
    );
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      status: PrescriptionStatus;
      suspension_reason: string | null;
      medication: string;
      dosage: string | null;
      instructions: string | null;
      end_date: string | null;
    }>
  ) => {
    const response = await httpClient.patch<PrescriptionRecord>(`/prescriptions/${id}`, data);
    return response.data;
  },
};

