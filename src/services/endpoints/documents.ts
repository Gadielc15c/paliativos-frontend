// Endpoint functions para Documents
import { httpClient } from "../http";
import type {
  DocumentExtractionResultRecord,
  DocumentProcessingRunRecord,
  DocumentRecord,
  PageResponse,
} from "../../types/api";

export const documentsEndpoints = {
  list: async (
    page = 1,
    pageSize = 50,
    filters?: Partial<{
      predicted_document_type_code: string;
      review_status: string;
      processing_status: string;
      application_status: string;
    }>
  ) => {
    const response = await httpClient.get<PageResponse<DocumentRecord>>("/documents", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  },

  getMeta: async (id: string) => {
    const response = await httpClient.get<DocumentRecord | { document: DocumentRecord }>(
      `/documents/${id}/meta`
    );
    const payload = response.data as DocumentRecord | { document: DocumentRecord };
    return "document" in payload ? payload.document : payload;
  },

  getBinary: async (id: string) => {
    const response = await httpClient.get<Blob>(`/documents/${id}`, {
      responseType: "blob",
    });
    return {
      blob: response.data,
      contentType: response.headers["content-type"] || "application/octet-stream",
      contentDisposition: response.headers["content-disposition"] || null,
    };
  },

  create: async (
    data: {
      patient_id?: string | null;
      episode_id?: string | null;
      doctor_id?: string | null;
      document_type_id?: string | null;
      declared_document_type_id?: string | null;
      title: string;
      file_name?: string | null;
      file_path?: string | null;
      mime_type?: string | null;
      metadata?: Record<string, unknown> | null;
    }
  ) => {
    const response = await httpClient.post<DocumentRecord>("/documents", data);
    return response.data;
  },

  upload: async (data: {
    file: File;
    patient_id?: string | null;
    episode_id?: string | null;
    doctor_id?: string | null;
    declared_document_type_id?: string | null;
    title?: string | null;
    metadata?: Record<string, unknown> | null;
    auto_extract_patient?: boolean;
    extract_patient_in_background?: boolean;
  }) => {
    const formData = new FormData();
    formData.append("file", data.file);
    if (data.patient_id) formData.append("patient_id", data.patient_id);
    if (data.episode_id) formData.append("episode_id", data.episode_id);
    if (data.doctor_id) formData.append("doctor_id", data.doctor_id);
    if (data.declared_document_type_id) {
      formData.append("declared_document_type_id", data.declared_document_type_id);
    }
    if (data.title) formData.append("title", data.title);
    if (data.metadata) formData.append("metadata_json", JSON.stringify(data.metadata));
    if (typeof data.auto_extract_patient === "boolean") {
      formData.append("auto_extract_patient", String(data.auto_extract_patient));
    }
    if (typeof data.extract_patient_in_background === "boolean") {
      formData.append(
        "extract_patient_in_background",
        String(data.extract_patient_in_background)
      );
    }

    const response = await httpClient.post<DocumentRecord>("/documents/upload", formData, {
      timeout: 120000,
    });
    return response.data;
  },

  process: async (
    id: string,
    data: {
      extracted_payload?: Record<string, unknown>;
      matched_patient_id?: string | null;
      schema_version?: string | null;
      validation_flags?: string[];
    }
  ) => {
    const response = await httpClient.post<DocumentRecord>(`/documents/${id}/process`, data);
    return response.data;
  },

  approve: async (
    id: string,
    data: {
      extraction_result_id?: string | null;
      document_type_id?: string | null;
      matched_patient_id?: string | null;
      validation_flags?: string[];
    }
  ) => {
    const response = await httpClient.post<DocumentRecord>(`/documents/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: string, data: { reason?: string | null }) => {
    const response = await httpClient.post<DocumentRecord>(`/documents/${id}/reject`, data);
    return response.data;
  },

  apply: async (id: string, data?: { extraction_result_id?: string | null }) => {
    const response = await httpClient.post<DocumentRecord>(`/documents/${id}/apply`, data || {});
    return response.data;
  },

  listProcessingRuns: async (id: string, page = 1, pageSize = 20) => {
    const response = await httpClient.get<PageResponse<DocumentProcessingRunRecord>>(
      `/documents/${id}/processing-runs`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  },

  listExtractionResults: async (id: string, page = 1, pageSize = 20) => {
    const response = await httpClient.get<PageResponse<DocumentExtractionResultRecord>>(
      `/documents/${id}/extraction-results`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      title: string;
      file_name: string | null;
      file_path: string | null;
      mime_type: string | null;
      metadata: Record<string, unknown> | null;
      processing_status: string;
      review_status: string;
      application_status: string;
      matched_patient_id: string | null;
    }>
  ) => {
    const response = await httpClient.patch<DocumentRecord>(`/documents/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await httpClient.delete(`/documents/${id}`);
  },
};
