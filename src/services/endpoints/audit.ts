// Endpoint functions para Audit
import { httpClient } from "../http";
import type { AuditLogRecord, PageResponse } from "../../types/api";

export const auditEndpoints = {
  list: async (
    params: {
      page?: number;
      pageSize?: number;
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
    } = {}
  ) => {
    const response = await httpClient.get<PageResponse<AuditLogRecord>>("/audit", {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 100,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        user_id: params.userId,
      },
    });
    return response.data;
  },
};
