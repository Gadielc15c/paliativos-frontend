import { httpClient } from "./http";
import type { Permission, User } from "../types/common";
import type { AuthTokenResponse, CurrentUserResponse } from "../types/api";

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const PERMISSIONS_BY_ROLE: Record<User["role"], Permission[]> = {
  admin: [
    "patients:read",
    "patients:write",
    "billing:read",
    "billing:write",
    "episodes:read",
    "episodes:write",
    "finance:read",
    "finance:write",
    "documents:read",
    "documents:write",
    "reports:read",
    "audit:read",
  ],
  doctor: [
    "patients:read",
    "patients:write",
    "billing:read",
    "billing:write",
    "episodes:read",
    "episodes:write",
    "finance:read",
    "documents:read",
    "reports:read",
  ],
  secretary: [
    "patients:read",
    "billing:read",
    "documents:read",
  ],
};

export interface AuthSession {
  user: User;
  permissions: Permission[];
}

interface LoginPayload {
  email: string;
  password: string;
}

const toAppUser = (user: CurrentUserResponse): User => ({
  id: user.id,
  name: user.full_name,
  email: user.email,
  role: user.role,
  doctorId: user.doctor_id,
  isActive: user.is_active,
  createdAt: new Date().toISOString(),
});

const persistTokens = (tokens: AuthTokenResponse) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const getPermissionsForRole = (role: User["role"]): Permission[] =>
  PERMISSIONS_BY_ROLE[role] || [];

export const login = async (payload: LoginPayload) => {
  const response = await httpClient.post<AuthTokenResponse>("/auth/login", payload);
  persistTokens(response.data);
  return response.data;
};

export const refreshSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

  const response = await httpClient.post<AuthTokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  persistTokens(response.data);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await httpClient.get<CurrentUserResponse>("/auth/me");
  return response.data;
};

const tryRestoreSession = async () => {
  if (!getAccessToken()) {
    return null;
  }

  try {
    return await getCurrentUser();
  } catch {
    if (!getRefreshToken()) {
      clearSession();
      return null;
    }

    try {
      await refreshSession();
      return await getCurrentUser();
    } catch {
      clearSession();
      return null;
    }
  }
};

export const restoreSession = async (): Promise<AuthSession | null> => {
  const currentUser = await tryRestoreSession();
  if (!currentUser) {
    return null;
  }
  return {
    user: toAppUser(currentUser),
    permissions: getPermissionsForRole(currentUser.role),
  };
};
