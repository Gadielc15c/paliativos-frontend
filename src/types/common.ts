// Tipos compartidos globalmente

export type UserRole = "admin" | "doctor" | "secretary";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  doctorId?: string | null;
  isActive?: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: Pagination;
    timestamp?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type RequestState = "idle" | "loading" | "success" | "error";

export interface QueryState<T> {
  state: RequestState;
  data: T | null;
  error: ApiError | null;
  refetch: () => void;
}

export type Permission =
  | "patients:read"
  | "patients:write"
  | "billing:read"
  | "billing:write"
  | "episodes:read"
  | "episodes:write"
  | "finance:read"
  | "finance:write"
  | "documents:read"
  | "documents:write"
  | "reports:read"
  | "audit:read";
