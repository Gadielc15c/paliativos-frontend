# Login GSAP

## Qué cambió

- Nuevo concepto visual: “respirar con calma” con fondo cálido, ondas suaves, círculo de respiración, partículas y camino orgánico.
- Escena narrativa: tarjetas de valores (`acompañamiento`, `dignidad`, `alivio`, `familia`, `presencia`) y trazo SVG de manos.
- Estética premium serena: vidrio/cristal, profundidad 3D sutil en tarjeta de login y sombras suaves.
- Estados explícitos de formulario:
  - Banner de estado `info` durante autenticación.
  - Banner de estado `error` con shake controlado.
  - Error por campo con borde invalidado y mensaje inline.
- GSAP con entrada progresiva, animaciones continuas lentas y `ScrollTrigger` para aparición de tarjetas.

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
