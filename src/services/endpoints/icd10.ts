import { httpClient } from "../http";
import type { ConsultationDiagnosis, Icd10Code } from "../../types/clinical";

export const icd10Endpoints = {
  search: async (q: string, limit = 20) =>
    (await httpClient.get<Icd10Code[]>("/icd10/search", { params: { q, limit } })).data,
  get: async (code: string) => (await httpClient.get<Icd10Code>(`/icd10/codes/${code}`)).data,
};

export const diagnosesEndpoints = {
  list: async (consultationId: string) =>
    (await httpClient.get<ConsultationDiagnosis[]>(`/consultations/${consultationId}/diagnoses`)).data,
  add: async (consultationId: string, code: string, isPrimary = false) =>
    (await httpClient.post<ConsultationDiagnosis[]>(`/consultations/${consultationId}/diagnoses`, { code, description: null, is_primary: isPrimary })).data,
  setPrimary: async (consultationId: string, diagnosisId: string) =>
    (await httpClient.patch<ConsultationDiagnosis[]>(`/consultations/${consultationId}/diagnoses/${diagnosisId}`, { is_primary: true })).data,
  remove: async (consultationId: string, diagnosisId: string) =>
    (await httpClient.delete<ConsultationDiagnosis[]>(`/consultations/${consultationId}/diagnoses/${diagnosisId}`)).data,
};
