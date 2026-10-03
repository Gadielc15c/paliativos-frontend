import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { patientsEndpoints, soapEndpoints } from "../../../services/endpoints";
import type { PatientRecord } from "../../../types/api";
import type { ApiError } from "../../../types/common";

/** Lowercase, no accents, single spaces: "José  Pérez" → "jose perez". */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/** Document numbers compared without dashes, dots or spaces: "001-1234567-8" = "00112345678". */
export const normDoc = (s: string) => s.replace(/[^0-9a-z]/gi, "").toLowerCase();

export const ALL_PATIENTS_KEY = ["patients", "all-for-search"] as const;

/** Every patient the user can see (pages of 100, capped at 10 pages). Used by the picker and duplicate checks. */
export async function fetchAllPatients(): Promise<PatientRecord[]> {
  const first = await patientsEndpoints.list(1, 100);
  const pages = Math.min(first.total_pages ?? 1, 10);
  const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, i) => patientsEndpoints.list(i + 2, 100))) : [];
  return [first, ...rest].flatMap((p) => p.items);
}

export const useAllPatients = (enabled = true) =>
  useQuery({ queryKey: ALL_PATIENTS_KEY, queryFn: fetchAllPatients, staleTime: 60 * 1000, enabled });

export interface Duplicates { byDocument: PatientRecord | null; byNameBirth: PatientRecord | null }

export async function findDuplicates(qc: QueryClient, v: { first_name: string; last_name: string; document_number: string; birth_date: string }): Promise<Duplicates> {
  const all = await qc.fetchQuery({ queryKey: ALL_PATIENTS_KEY, queryFn: fetchAllPatients, staleTime: 30 * 1000 });
  const doc = normDoc(v.document_number);
  const name = norm(`${v.first_name} ${v.last_name}`);
  return {
    byDocument: doc ? all.find((p) => normDoc(p.document_number) === doc) ?? null : null,
    byNameBirth: name && v.birth_date ? all.find((p) => norm(p.full_name || `${p.first_name} ${p.last_name}`) === name && p.birth_date === v.birth_date) ?? null : null,
  };
}

/** Creates today's draft consultation for a patient and opens the editor. */
export function useStartConsultation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (patientId: string) => soapEndpoints.create({ patient_id: patientId, consultation_date: new Date().toISOString() }),
    onSuccess: (c) => navigate(`/consultations/${c.id}`),
    onError: (e) => toast.error((e as unknown as ApiError)?.message || "No se pudo crear la consulta. Inténtalo de nuevo."),
  });
}
