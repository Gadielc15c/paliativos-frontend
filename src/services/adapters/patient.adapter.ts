// Adapter para transformar PatientContract a modelo interno si es necesario
import type { PatientRecord } from "../../types/api";
import type { PatientContract } from "../../types/contracts";

export interface Patient extends PatientContract {}

export const patientAdapter = {
  toInternal: (
    contract: PatientRecord,
    doctorName?: string
  ): Patient => {
    return {
      id: contract.id,
      name: contract.full_name,
      document: contract.document_number,
      birthDate: contract.birth_date || "",
      phone: contract.phone || undefined,
      email: undefined,
      secondaryPhone: contract.secondary_phone || undefined,
      address: contract.address || undefined,
      insuranceCompany: contract.insurer_name || undefined,
      assignedDoctor: doctorName,
      assignedDoctorId: contract.doctor_id,
      gender: contract.gender || undefined,
      notes: contract.notes || undefined,
      status: contract.status,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
    };
  },

  toContract: (patient: Patient): PatientContract => {
    return patient;
  },
};
