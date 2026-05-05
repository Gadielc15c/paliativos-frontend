import { httpClient } from "../http";
import type { DoctorRecord, PageResponse } from "../../types/api";

const normalizePageSize = (pageSize: number) => Math.min(100, Math.max(1, pageSize));

export const doctorsEndpoints = {
  list: async (page = 1, pageSize = 50, includeInactive = false) => {
    const response = await httpClient.get<PageResponse<DoctorRecord>>("/doctors", {
      params: {
        page,
        page_size: normalizePageSize(pageSize),
        include_inactive: includeInactive,
      },
    });
    return response.data;
  },
};
