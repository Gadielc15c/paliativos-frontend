import axios, { AxiosInstance, AxiosError } from "axios";
import type { ApiError } from "../types/common";

const resolveApiBaseUrl = () => {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8010/api/v1`;
  }

  return "http://127.0.0.1:8010/api/v1";
};

const API_BASE_URL = resolveApiBaseUrl();

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: agregar auth token si existe
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      // Let the browser/axios set multipart boundary automatically.
      if (config.headers) {
        delete (config.headers as Record<string, unknown>)["Content-Type"];
        delete (config.headers as Record<string, unknown>)["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: manejo de errores estandarizado
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let apiError: ApiError;

    if (error.response) {
      // Backend respondió con error
      const data = error.response.data as Record<string, unknown>;
      const errorPayload =
        data && typeof data.error === "object" && data.error !== null
          ? (data.error as Record<string, unknown>)
          : null;
      apiError = {
        code:
          (typeof errorPayload?.code === "string" && errorPayload.code) ||
          error.response.status.toString(),
        message:
          (typeof errorPayload?.message === "string" && errorPayload.message) ||
          (typeof data?.detail === "string" && data.detail) ||
          (typeof data?.message === "string" && data.message) ||
          error.message,
        details: data,
      };
    } else if (error.request) {
      // Request hecho pero sin respuesta (timeout, conexión perdida)
      apiError = {
        code: "CONNECTION_ERROR",
        message: "No response from server. Check your connection.",
      };
    } else {
      // Error en configuración del request
      apiError = {
        code: "REQUEST_ERROR",
        message: error.message,
      };
    }

    return Promise.reject(apiError);
  }
);

export default httpClient;
