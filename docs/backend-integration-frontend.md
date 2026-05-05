# Integración Frontend con Cambios Backend

## Endpoints nuevos integrados

- Estado del sistema:
  - `GET /api/v1/system/status` (consumido como `/system/status` en frontend)
- Documentos:
  - `GET /api/v1/documents/{id}/meta` para metadata JSON
  - `GET /api/v1/documents/{id}` para binario (nuevo helper)
- Facturación:
  - `GET /api/v1/invoices?patient_id=...` ya soportado en frontend
- Historia clínica (servicios listos):
  - `POST /api/v1/consultations`, `GET /api/v1/consultations/{patient_id}`
  - `POST /api/v1/diagnostics`, `GET /api/v1/diagnostics/{patient_id}`
  - `POST /api/v1/prescriptions`, `GET /api/v1/prescriptions/{patient_id}`

## Archivos modificados

- `src/services/endpoints/system.ts`
- `src/services/endpoints/clinical.ts`
- `src/services/endpoints/documents.ts`
- `src/services/endpoints/billing.ts`
- `src/services/endpoints/index.ts`
- `src/types/api.ts`
- `src/modules/documents/pages/DocumentsPage.tsx`
- `src/modules/billing/hooks/useBilling.ts`
- `src/modules/billing/pages/BillingPage.tsx`
- `src/app/layouts/Sidebar.tsx`
- `src/app/layouts/layouts.css`

## Cambios de comportamiento

- El engrane de configuración ahora consulta estado real de servicios (backend/db/minio/llm).
- En documentos, el polling usa `/meta` para evitar conflicto con endpoint binario.
- Facturación usa filtro server-side por `patient_id` cuando viene en querystring.

## Nota operativa

Para ver estado en UI, backend debe exponer `/api/v1/system/status` y estar accesible desde `VITE_API_BASE_URL`.
