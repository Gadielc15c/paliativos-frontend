// Endpoint functions para Secretaries
import { httpClient } from "../http";
import type { PageResponse, SecretaryRecord } from "../../types/api";

export const secretariesEndpoints = {
  list: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<SecretaryRecord>>(
      "/secretaries",
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  },

  listForDoctor: async (doctorId: string, page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<SecretaryRecord>>(
      `/doctors/${doctorId}/secretaries`,
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  },

  get: async (id: string) => {
    const response = await httpClient.get<SecretaryRecord>(`/secretaries/${id}`);
    return response.data;
  },

  create: async (
    data: {
      doctor_id?: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      is_active?: boolean;
    }
  ) => {
    const response = await httpClient.post<SecretaryRecord>("/secretaries", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      doctor_id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
      notes: string | null;
      is_active: boolean;
    }>
  ) => {
    const response = await httpClient.patch<SecretaryRecord>(`/secretaries/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await httpClient.delete(`/secretaries/${id}`);
  },
};
