import { httpClient } from "../http";
import type { PageResponse } from "../../types/api";
import type { StaffRead } from "../../types/clinical";

export interface StaffCreate {
  type: "doctor" | "secretary";
  first_name: string;
  last_name: string;
  email: string;
  temporary_password: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  doctor_id?: string | null;
  notes?: string | null;
}

export const staffEndpoints = {
  list: async (params: { type?: string; is_active?: boolean; q?: string; page?: number; page_size?: number } = {}) =>
    (await httpClient.get<PageResponse<StaffRead>>("/admin/staff", { params: { page_size: 100, ...params } })).data,
  create: async (body: StaffCreate) => (await httpClient.post<StaffRead>("/admin/staff", body)).data,
  update: async (id: string, body: Partial<StaffRead>) => (await httpClient.patch<StaffRead>(`/admin/staff/${id}`, body)).data,
  resetPassword: async (id: string) =>
    (await httpClient.post<{ id: string; temporary_password: string | null }>(`/admin/staff/${id}/reset-password`, {})).data,
};
