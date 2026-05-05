import { httpClient } from "../http";
import type { ReconciliationRecord } from "../../types/api";

export const reconciliationEndpoints = {
  listForPatient: async (patientId: string) => {
    const response = await httpClient.get<ReconciliationRecord[]>(
      `/medication-reconciliations/patient/${patientId}`
    );
    return response.data;
  },

  get: async (id: string) => {
    const response = await httpClient.get<ReconciliationRecord>(
      `/medication-reconciliations/${id}`
    );
    return response.data;
  },
};
