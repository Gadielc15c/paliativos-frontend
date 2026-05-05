import { httpClient } from "../http";
import type { SystemStatusResponse } from "../../types/api";

const normalizeSystemStatus = (payload: unknown): SystemStatusResponse => {
  if (payload && typeof payload === "object" && "status" in (payload as Record<string, unknown>)) {
    const nested = (payload as { status?: unknown }).status;
    if (nested && typeof nested === "object") {
      return nested as SystemStatusResponse;
    }
  }
  return payload as SystemStatusResponse;
};

export const systemEndpoints = {
  getStatus: async () => {
    const response = await httpClient.get<SystemStatusResponse>("/system/status");
    return normalizeSystemStatus(response.data);
  },
};

