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

  create: async (data: {
    patient_id: string;
    name: string;
    condition_type: "diagnosis" | "comorbidity" | "allergy" | "antecedent";
    status?: "active" | "resolved" | "unknown";
    is_chronic?: boolean | null;
    normalized_code?: string | null;
    normalized_system?: "LOCAL" | "ICD10" | "SNOMED";
    onset_date?: string | null;
  }) => {
    const response = await httpClient.post<PatientConditionRecord>("/patient-conditions", data);
    return response.data;
  },
};
