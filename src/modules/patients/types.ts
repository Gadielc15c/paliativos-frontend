// Tipos locales para pantalla de Patients
import type { PatientContract } from "../../types/contracts";

export type PatientStatus = "active" | "follow-up" | "inactive";

export interface PatientsPageState {
  selectedPatientId: string | null;
  searchQuery: string;
  filters: {
    status?: PatientStatus;
    doctor?: string;
  };
}

export interface PatientUIModel extends PatientContract {
  // Extensiones para UI si es necesario
}

export interface PatientListItem {
  id: string;
  name: string;
  document: string;
  doctor?: string;
  status: PatientStatus;
  lastUpdated: string;
}

export interface PatientProfileData {
  patient: PatientUIModel;
  events: PatientEvent[];
  financialSummary: FinancialSummary;
}

export interface PatientEvent {
  id: string;
  type: "admission" | "discharge" | "update" | "invoice";
  title: string;
  date: string;
  description?: string;
  relatedEntity?: {
    type: "episode" | "invoice";
    id: string;
  };
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}
