// Endpoint functions para Patients
import { httpClient } from "../http";
import type { ClinicalEventRecord, PageResponse, PatientProfileResponse, PatientRecord } from "../../types/api";

export const patientsEndpoints = {
  list: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<PatientRecord>>("/patients", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await httpClient.get<PatientRecord>(`/patients/${id}`);
    return response.data;
  },

  create: async (
    data: {
      doctor_id?: string;
      first_name: string;
      last_name: string;
      document_number: string;
      birth_date?: string | null;
      gender?: "female" | "male" | "other" | "unknown" | null;
      phone?: string | null;
      secondary_phone?: string | null;
      address?: string | null;
      insurer_name?: string | null;
      status?: "active" | "inactive" | "deceased";
      notes?: string | null;
      is_active?: boolean;
    }
  ) => {
    const response = await httpClient.post<PatientRecord>("/patients", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      doctor_id: string;
      first_name: string;
      last_name: string;
      document_number: string;
      birth_date: string | null;
      gender: "female" | "male" | "other" | "unknown" | null;
      phone: string | null;
      secondary_phone: string | null;
      address: string | null;
      insurer_name: string | null;
      status: "active" | "inactive" | "deceased";
      notes: string | null;
      is_active: boolean;
    }>
  ) => {
    const response = await httpClient.patch<PatientRecord>(`/patients/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await httpClient.delete(`/patients/${id}`);
  },

  getProfile: async (id: string) => {
    const response = await httpClient.get<PatientProfileResponse>(`/patients/${id}/profile`);
    return response.data;
  },

  getTimeline: async (id: string, limit = 100) => {
    const response = await httpClient.get<ClinicalEventRecord[]>(`/patients/${id}/timeline`, {
      params: { limit },
    });
    return response.data;
  },
};
