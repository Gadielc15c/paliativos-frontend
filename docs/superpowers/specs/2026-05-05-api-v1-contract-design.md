# Design: Paliativos API v1 Contract Implementation

**Date:** 2026-05-05  
**Approach:** Layers — types → endpoints → hooks → UI

---

## Scope

Implement all new/changed endpoints from the Paliativos API v1 Frontend Contract:

| Area | New endpoints | Changed |
|---|---|---|
| Patient Profile | `GET /patients/{id}/profile` | — |
| Clinical Timeline | `GET /patients/{id}/timeline` | — |
| Prescriptions | `PATCH /prescriptions/{id}` | POST response has new fields |
| Document AI Validation | `POST /documents/{id}/validate-extraction` | `GET /meta`, extraction-results have new fields |
| Medication Reconciliation | `POST`, `GET /patient/{id}`, `GET /{id}` | — |
| Expenses | — | `POST /expenses` accepts `patient_id` |

---

## Layer 1 — Types (`src/types/api.ts`)

All changes additive. No breaking changes.

### Modified records

**`PrescriptionRecord`** — add:
```ts
status: "active" | "suspended" | "completed" | "discontinued"
start_date: string | null
end_date: string | null
discontinued_at: string | null
suspension_reason: string | null
```

**`DocumentRecord`** — add:
```ts
review_required: boolean
review_trigger_reasons: string[]
```

**`DocumentExtractionResultRecord`** — add:
```ts
per_field_confidence: Record<string, number>
validated_payload: Record<string, unknown> | null
validated_by_user_id: string | null
validated_at: string | null
validation_source: "auto" | "human" | null
ai_human_diff: Record<string, { ai: unknown; human: unknown }> | null
```

**`ExpenseRecord`** — add:
```ts
patient_id: string | null
```

### New records

```ts
// Profile aggregated response
interface PatientProfileResponse {
  patient: PatientRecord & { doctor_name: string }
  active_conditions: ActiveConditionSummary[]
  active_prescriptions: ActivePrescriptionSummary[]
  recent_consultations: RecentConsultationSummary[]
  recent_documents: RecentDocumentSummary[]
  recent_events: ClinicalEventRecord[]
  financial: PatientFinancialSummary
}

interface PatientFinancialSummary {
  total_invoiced: string
  total_paid: string
  outstanding_balance: string
  total_expenses: string
  net_margin: string
  invoice_count: number
  payment_count: number
}

// Clinical timeline event
interface ClinicalEventRecord {
  id: string
  patient_id: string
  doctor_id: string
  event_type: string
  source_module: string
  occurred_at: string
  summary: string
  payload_ref: Record<string, string>
  created_at: string
}

// Medication reconciliation
interface ReconciliationItemRecord {
  medication: string
  prior_prescription_id: string | null
  prior_dosage: string | null
  current_dosage: string | null
  ai_extracted_dosage: string | null
  decision: "continue" | "suspend" | "substitute" | "adjust_dose"
  new_dosage: string | null
  clinical_justification: string | null
}

interface ReconciliationRecord {
  id: string
  patient_id: string
  doctor_id: string
  consultation_id: string | null
  document_id: string | null
  reconciled_by_user_id: string
  reconciled_at: string
  items: ReconciliationItemRecord[]
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

## Layer 2 — Endpoints

### `src/services/endpoints/patients.ts`
Add:
- `getProfile(id: string): Promise<PatientProfileResponse>`
- `getTimeline(id: string, limit?: number): Promise<ClinicalEventRecord[]>`

### `src/services/endpoints/clinical.ts`
Add to `prescriptionsEndpoints`:
- `update(id: string, data: { status?, suspension_reason?, medication?, dosage?, instructions?, end_date? })`

### `src/services/endpoints/documents.ts`
Add:
- `validateExtraction(id: string, data: { extraction_result_id?, validated_payload, per_field_confidence? })`

### `src/services/endpoints/finance.ts`
Update `createExpense` to accept optional `patient_id: string | null`.

### `src/services/endpoints/reconciliation.ts` (NEW)
```ts
export const reconciliationEndpoints = {
  listForPatient(patientId: string): Promise<ReconciliationRecord[]>
  get(id: string): Promise<ReconciliationRecord>
}
```

### `src/services/endpoints/index.ts`
Export `reconciliationEndpoints`.

---

## Layer 3 — Hooks / Query changes

### `PatientsPage.tsx`
Replace 5-endpoint workspace query with single `getProfile()` call.  
Pass `PatientProfileResponse` data down to `PatientProfile`.  
Load timeline via second query `getTimeline()` for ContextualPanel.

### `DocumentsPage.tsx`
After listing documents, detect any with `review_required === true && review_status === "manual_review"`.  
Fetch extraction result for that doc.  
Set state to open `ExtractionValidationModal`.

---

## Layer 4 — UI

### `PatientProfile.tsx`
- Replace `PatientWorkspace` props with `PatientProfileResponse` props
- Add **"Medicación activa"** section: list `active_prescriptions` with status badge + action buttons (Suspender / Completar / Descontinuar) that call `prescriptionsEndpoints.update()`
- Add **"Reconciliaciones"** section: list from `GET /medication-reconciliations/patient/{id}`, show date + item count + decision summary
- Update **financial section** to use `financial.*` decimal strings from profile (total_invoiced, total_paid, outstanding_balance, total_expenses, net_margin)
- Update **conditions section** to use `active_conditions` from profile

### `ContextualPanel` — Timeline tab
When a patient is selected, show tab "Eventos" with timeline from `getTimeline()`.  
Each event: icon by `event_type`, `summary` text, `occurred_at` date.

Event type → icon mapping:
| event_type | icon |
|---|---|
| consultation_created | Stethoscope |
| prescription_started/suspended/completed/discontinued | Pill |
| condition_recorded | Activity |
| invoice_issued | FileText |
| payment_recorded | DollarSign |
| reconciliation_completed | CheckSquare |
| diagnostic_created | Microscope |

### `ExtractionValidationModal.tsx` (NEW)
Location: `src/modules/documents/components/ExtractionValidationModal.tsx`

Flow:
1. Receives `document` + `extractionResult` as props
2. Renders each field in `extracted_payload` as editable input
3. Colors field border by `per_field_confidence[field]`:
   - `< 0.60` → red
   - `0.60–0.79` → yellow
   - `>= 0.80` → green
4. "Confirmar" → `POST /documents/{id}/validate-extraction` with edited payload
5. "Rechazar" → `POST /documents/{id}/reject`
6. On success → invalidate doc query, close modal

### `FinancePage` (or wherever expenses are created)
Add optional patient selector to expense creation form.  
Pass `patient_id` to `financeEndpoints.createExpense()`.

---

## Decision log

| Decision | Reason |
|---|---|
| Modal lives in DocumentsPage | That's where the upload→process→approve→apply flow lives. PatientProfile is read-only. |
| Profile endpoint replaces 5 parallel calls | Single request, less network, backend does the aggregation |
| Timeline in ContextualPanel | No new page needed, user keeps profile context while reviewing events |
| Reconciliation — GET only | POST requires complex form; deferred to next iteration |
| Layers approach | Types are additive (no breakage), endpoints independent, UI depends on both |
