# Frontend: Interacciones Operativas Reales

## Objetivo

Eliminar acciones pseudo-funcionales y reemplazarlas por flujos reales contra API.

## Cambios aplicados

### 1) Menú de sesión (TopBar)

- `Mi sesión` ahora abre `/config`.
- `Cerrar sesión` ahora limpia tokens, permisos y usuario, devolviendo al login.
- Archivo: `src/app/layouts/TopBar.tsx`

### 2) Pacientes: acciones contextuales ya no hardcodeadas

- `Emitir factura`:
  - Antes: creaba una factura casi vacía automáticamente.
  - Ahora: abre formulario real con fecha, aseguradora, item opcional (cantidad y precio) y notas.
  - Usa `POST /invoices` con `date` e `items`.
- `Actualizar notas`:
  - Antes: agregaba texto fijo automático en `notes`.
  - Ahora: abre editor de notas y guarda contenido real.
  - Usa `PATCH /patients/{id}`.
- Archivo: `src/modules/patients/pages/PatientsPage.tsx`

### 3) Episodios: edición real

- Antes: la pantalla era básicamente de consulta.
- Ahora: permite editar estado, diagnóstico, notas y fecha de cierre del episodio.
- Usa `PATCH /episodes/{id}`.
- Archivos:
  - `src/modules/episodes/pages/EpisodesPage.tsx`
  - `src/modules/episodes/pages/EpisodesPage.css`

### 4) Secretarias: alta y cambio de estado

- Antes: solo lectura.
- Ahora:
  - alta de secretaria (nombre, apellido, doctor, contacto, notas),
  - activación/desactivación por registro.
- Usa:
  - `POST /secretaries`
  - `PATCH /secretaries/{id}`
- Archivo: `src/modules/secretaries/pages/SecretariesPage.tsx`

### 5) Facturación: edición en detalle

- Antes: detalle de factura solo visual.
- Ahora: edición de estado y notas desde el panel de detalle.
- Usa `PATCH /invoices/{id}`.
- Archivos:
  - `src/modules/billing/components/InvoiceDetail.tsx`
  - `src/modules/billing/components/InvoiceDetail.css`
  - `src/modules/billing/pages/BillingPage.tsx`

## Verificación ejecutada

- `npm run build` -> OK

## Pendiente recomendado (siguiente fase)

- Agregar creación/edición de movimientos en `FinancePage` (hoy consulta).
- Agregar filtros avanzados y paginación server-side en `AuditPage` y `ReportsPage`.
- Agregar edición granular de items de factura (`add/update/delete item`) desde UI.
