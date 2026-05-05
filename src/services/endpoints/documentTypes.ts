import { httpClient } from "../http";
import type { DocumentTypeRecord, PageResponse } from "../../types/api";

export const documentTypesEndpoints = {
  list: async (page = 1, pageSize = 50) => {
    const response = await httpClient.get<PageResponse<DocumentTypeRecord>>(
      "/document-types",
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  },
};

