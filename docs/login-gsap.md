# Login GSAP

## Qué cambió

- UI del login simplificada: fondo sutil, tarjeta sólida, jerarquía clara de título/subtítulo y botón principal visible.
- Inputs con estructura profesional: contenedor, icono, focus ring, placeholder y estado disabled más legible.
- Identidad mínima: marca visual en cabecera (`HeartPulse`) sin agregar dependencias.
- GSAP más sobrio: entrada escalonada corta, microinteracción en foco, shake al error y pulso de botón al enviar.

## Endpoint de autenticación usado

- `POST /api/v1/auth/login-form`
- `Content-Type: application/x-www-form-urlencoded`
- Campos enviados desde frontend: `username`, `password`

## Dónde está

- `src/modules/auth/LoginPage.tsx`
- `src/modules/auth/LoginPage.css`
- `src/services/auth.ts`

## Consideraciones operativas

- Respeta `prefers-reduced-motion: reduce`.
- No cambia flujo de sesión (`restoreSession`, `refresh`, `me`); solo cambia formato/endpoint de login.
- Limpieza de listeners y tweens con `gsap.context(...).revert()` al desmontar.
