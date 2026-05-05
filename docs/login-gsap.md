# Login GSAP

## Qué cambió

- Diseño simplificado y limpio: tarjeta única centrada, sin bloques narrativos laterales ni líneas decorativas.
- Concepto visual sereno: fondo cálido, dos masas de luz suaves y círculo de respiración en segundo plano.
- Estética premium serena: vidrio/cristal, profundidad 3D sutil en tarjeta y sombras controladas.
- Estados explícitos de formulario:
  - Banner de estado `info` durante autenticación.
  - Banner de estado `error` con shake controlado.
  - Error por campo con borde invalidado y mensaje inline.
- GSAP con entrada progresiva y animaciones continuas lentas, sin movimiento agresivo.

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
