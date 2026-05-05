import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { doctorsEndpoints, patientsEndpoints } from "../../../services/endpoints";
import { patientAdapter } from "../../../services/adapters";
import type { PatientContract } from "../../../types/contracts";
import type { ApiError } from "../../../types/common";

const matchesPatient = (patient: PatientContract, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [patient.name, patient.document, patient.assignedDoctor]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
};

const toDoctorLookup = (items: { id: string; full_name: string }[]) =>
  Object.fromEntries(items.map((doctor) => [doctor.id, doctor.full_name]));

/**
 * Hook para listar pacientes
 */
export function usePatients(
  page: number = 1,
  limit: number = 50,
  query: string = ""
): UseQueryResult<PatientContract[], ApiError> {
  return useQuery({
    queryKey: ["patients", page, limit, query],
    queryFn: async () => {
      try {
        const [patientsPage, doctorsPage] = await Promise.all([
          patientsEndpoints.list(page, limit),
          doctorsEndpoints.list(1, 100, true),
        ]);
        const doctorsById = toDoctorLookup(doctorsPage.items);

        return patientsPage.items
          .map((patient) =>
            patientAdapter.toInternal(
              patient,
              doctorsById[patient.doctor_id] || patient.doctor_id
            )
          )
          .filter((patient) => matchesPatient(patient, query));
      } catch (error) {
        throw error as ApiError;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener paciente específico
 */
export function usePatientDetail(
  patientId: string | null
): UseQueryResult<PatientContract | null, ApiError> {
  return useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      try {
        const [patient, doctorsPage] = await Promise.all([
          patientsEndpoints.get(patientId),
          doctorsEndpoints.list(1, 100, true),
        ]);
        const doctorsById = toDoctorLookup(doctorsPage.items);

        return patientAdapter.toInternal(
          patient,
          doctorsById[patient.doctor_id] || patient.doctor_id
        );
      } catch (error) {
        throw error as ApiError;
      }
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar pacientes
 */
export function usePatientSearch(
  query: string
): UseQueryResult<PatientContract[], ApiError> {
  return usePatients(1, 100, query);
}
