import { httpClient } from "../http";
import type { ConsultationRead, SoapNote } from "../../types/clinical";
import type {
  ConsultationRecord,
  DiagnosticRecord,
  PrescriptionRecord,
} from "../../types/api";

type PrescriptionStatus = "active" | "suspended" | "completed" | "discontinued";

export const consultationsEndpoints = {
  create: async (data: {
    patient_id: string;
    consultation_date?: string;
    reason: string;
    notes?: string | null;
  }) => {
    const response = await httpClient.post<ConsultationRecord>("/consultations", data);
    return response.data;
  },
  listByPatient: async (patientId: string) => {
    const response = await httpClient.get<ConsultationRead[]>(
      `/consultations/patient/${patientId}`
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
    start_date?: string | null;
    end_date?: string | null;
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

/** Fase 1 SOAP lifecycle: draft (autosave with optimistic version) -> signed -> amendments. */
export const soapEndpoints = {
  create: async (data: { patient_id: string; consultation_date?: string; chief_complaint?: string | null }) =>
    (await httpClient.post<ConsultationRead>("/consultations", data)).data,
  get: async (id: string) => (await httpClient.get<ConsultationRead>(`/consultations/${id}`)).data,
  listByPatient: async (patientId: string) =>
    (await httpClient.get<ConsultationRead[]>(`/consultations/patient/${patientId}`)).data,
  patch: async (id: string, version: number, fields: Partial<SoapNote> & { reason?: string; notes?: string | null }) =>
    (await httpClient.patch<ConsultationRead>(`/consultations/${id}`, { version, ...fields })).data,
  sign: async (id: string, version?: number) =>
    (await httpClient.post<ConsultationRead>(`/consultations/${id}/sign`, version ? { version } : {})).data,
  amend: async (id: string, content: string, reason?: string) =>
    (await httpClient.post<ConsultationRead>(`/consultations/${id}/amendments`, { content, reason: reason || null })).data,
};
