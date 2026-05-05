import type { SecretaryRecord } from "../../types/api";
import type { SecretaryContract } from "../../types/contracts";

export const secretaryAdapter = {
  toInternal: (
    secretary: SecretaryRecord,
    doctorName?: string
  ): SecretaryContract => ({
    id: secretary.id,
    name: secretary.full_name,
    email: secretary.email || undefined,
    phone: secretary.phone || undefined,
    assignedDoctor: doctorName || secretary.doctor_id,
    assignedDoctorId: secretary.doctor_id,
    notes: secretary.notes || undefined,
    status: secretary.is_active ? "active" : "inactive",
    createdAt: secretary.created_at,
    updatedAt: secretary.updated_at,
  }),
};
