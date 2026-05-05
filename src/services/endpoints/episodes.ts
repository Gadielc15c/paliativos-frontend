// Endpoint functions para Episodes
import { httpClient } from "../http";
import type { EpisodeRecord, PageResponse } from "../../types/api";

export const episodesEndpoints = {
  list: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<EpisodeRecord>>("/episodes", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await httpClient.get<EpisodeRecord>(`/episodes/${id}`);
    return response.data;
  },

  create: async (
    data: {
      patient_id: string;
      episode_type: string;
      start_date: string;
      end_date?: string | null;
      diagnosis?: string | null;
      insurer_name?: string | null;
      notes?: string | null;
      status?: "open" | "closed" | "cancelled";
    }
  ) => {
    const response = await httpClient.post<EpisodeRecord>("/episodes", data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      episode_type: string;
      start_date: string;
      end_date: string | null;
      diagnosis: string | null;
      insurer_name: string | null;
      notes: string | null;
      status: "open" | "closed" | "cancelled";
    }>
  ) => {
    const response = await httpClient.patch<EpisodeRecord>(
      `/episodes/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await httpClient.delete<EpisodeRecord>(`/episodes/${id}`);
    return response.data;
  },
};
