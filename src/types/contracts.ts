// Contratos de API del backend
// Estas interfaces se usan en endpoints y adapters para transformar respuestas

// Patients
export interface PatientContract {
  id: string;
  name: string;
  document: string;
  birthDate: string;
  phone?: string;
  email?: string;
  secondaryPhone?: string;
  address?: string;
  insuranceCompany?: string;
  assignedDoctor?: string;
  assignedDoctorId?: string;
  gender?: "female" | "male" | "other" | "unknown";
  notes?: string;
  status: "active" | "inactive" | "deceased";
  createdAt: string;
  updatedAt: string;
}

// Episodes
export interface EpisodeContract {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  startDate: string;
  endDate?: string;
  diagnosis?: string;
  insurerName?: string;
  notes?: string;
  status: "open" | "closed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// Billing
export interface InvoiceContract {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  insuranceCompany: string;
  subtotal: number;
  discounts: number;
  total: number;
  paid: number;
  balance: number;
  insurerExpectedAmount: number;
  patientExpectedAmount: number;
  status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
  issuedAt: string;
  notes?: string;
  items: InvoiceDetailContract[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetailContract {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  coverage: number;
  patientResponsibility: number;
}

// Finance
export interface FinanceMovementContract {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  doctorId?: string;
  invoiceId?: string;
  payerType?: string;
  notes?: string;
  source?: string;
  method?: string;
  reference?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Documents
export interface DocumentContract {
  id: string;
  patientId?: string;
  episodeId?: string;
  doctorId?: string;
  documentTypeId: string;
  title: string;
  fileName?: string;
  filePath?: string;
  mimeType?: string;
  storageProvider?: string;
  type: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdByUserId?: string;
}

// Reports
export interface DoctorAggregateContract {
  doctorId: string | null;
  doctorName: string | null;
}

export interface PatientsByDoctorContract extends DoctorAggregateContract {
  totalCount: number;
  activeCount: number;
  deletedCount: number;
}

export interface IncomeByDoctorContract extends DoctorAggregateContract {
  paymentsCount: number;
  totalIncome: number;
}

export interface ExpensesByDoctorContract extends DoctorAggregateContract {
  expensesCount: number;
  totalExpenses: number;
}

export interface DoctorFinancialSummaryContract extends DoctorAggregateContract {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
}

export interface FinancialSummaryContract {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  perDoctor: DoctorFinancialSummaryContract[];
}

export interface InvoicesByStatusContract {
  status: string;
  invoiceCount: number;
  totalAmount: number;
}

// Audit
export interface AuditLogContract {
  id: string;
  userId: string;
  action: "create" | "update" | "delete" | "login";
  entityType: string;
  entityId: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ip?: string;
  timestamp: string;
}

// Secretaries
export interface SecretaryContract {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  assignedDoctor: string;
  assignedDoctorId: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
