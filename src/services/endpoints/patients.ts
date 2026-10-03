// Endpoint functions para Patients
import { httpClient } from "../http";
import type { TimelineResponse, TimelineType } from "../../types/clinical";
import type { PageResponse, PatientProfileResponse, PatientRecord } from "../../types/api";

const normalizePageSize = (pageSize: number) => Math.min(100, Math.max(1, pageSize));

export const patientsEndpoints = {
  list: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<PatientRecord>>("/patients", {
      params: { page, page_size: normalizePageSize(pageSize) },
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

  /** Grouped-by-day timeline (BREAKING in Fase 1: was ClinicalEventRecord[]). */
  getTimeline: async (id: string, opts: { types?: TimelineType[]; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    (opts.types ?? []).forEach((t) => params.append("type", t));
    params.set("page", String(opts.page ?? 1));
    params.set("page_size", String(normalizePageSize(opts.pageSize ?? 25)));
    const response = await httpClient.get<TimelineResponse>(`/patients/${id}/timeline`, { params });
    return response.data;
  },
};
