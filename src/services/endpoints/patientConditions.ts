import { httpClient } from "../http";
import type { PageResponse, PatientConditionRecord } from "../../types/api";

export const patientConditionsEndpoints = {
  listForPatient: async (patientId: string, page = 1, pageSize = 100) => {
    const response = await httpClient.get<PageResponse<PatientConditionRecord>>(
      `/patients/${patientId}/conditions`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  },
};
