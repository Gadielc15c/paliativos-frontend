# Frontend: Interacciones Operativas Reales

## Objetivo

Eliminar acciones pseudo-funcionales y reemplazarlas por flujos reales contra API.

## Cambios aplicados

### 1) Menú de sesión (TopBar)

- `Mi sesión` ahora abre `/config`.
- `Cerrar sesión` ahora limpia tokens, permisos y usuario, devolviendo al login.
- Archivo: `src/app/layouts/TopBar.tsx`

### 1.1) Cierre de sesión visible en Sidebar

- Se agregó botón rojo `Cerrar sesión` junto a `Ajustes visuales`.
- Limpia sesión y devuelve a login inmediatamente.
- Archivos:
  - `src/app/layouts/Sidebar.tsx`
  - `src/app/layouts/layouts.css`

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

### 2.1) Modo exclusivo de paciente (prioridad UX)

- Al seleccionar paciente, se activa foco en perfil.
- Nuevo modo exclusivo para priorizar atención clínica del paciente seleccionado.
- Permite alternar entre vista enfocada y listado completo.
- Archivos:
  - `src/modules/patients/pages/PatientsPage.tsx`
  - `src/modules/patients/pages/PatientsPage.css`

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
- Además: alta rápida de ítems en la factura + recálculo automático de totales.
- Usa `PATCH /invoices/{id}`.
- Usa `POST /invoices/{id}/items` + `POST /invoices/{id}/recalculate`.
- Archivos:
  - `src/modules/billing/components/InvoiceDetail.tsx`
  - `src/modules/billing/components/InvoiceDetail.css`
  - `src/modules/billing/pages/BillingPage.tsx`
  - `src/modules/billing/hooks/useBilling.ts`

## Verificación ejecutada

- `npm run build` -> OK

## Pendiente recomendado (siguiente fase)

- Agregar creación/edición de movimientos en `FinancePage` (hoy consulta).
- Agregar filtros avanzados y paginación server-side en `AuditPage` y `ReportsPage`.
- Agregar edición granular de items de factura (`add/update/delete item`) desde UI.
