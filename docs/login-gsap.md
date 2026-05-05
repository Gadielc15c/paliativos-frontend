# Login GSAP

## Qué cambió

- Animación de entrada escalonada para `aura`, tarjeta, título, subtítulo, campos y botón.
- Microinteracción en foco de inputs (`lift` del campo + refuerzo visual del `aura`).
- Efecto de profundidad en escritorio (tilt suave de tarjeta según puntero).
- Animación de error con aparición + shake corto de la tarjeta.
- Pulso del botón cuando empieza/termina envío.

## Dónde está

- `src/modules/auth/LoginPage.tsx`
- `src/modules/auth/LoginPage.css`

## Consideraciones operativas

- Respeta `prefers-reduced-motion: reduce` para evitar animación de entrada y transiciones agresivas.
- No cambia contrato de autenticación ni endpoints.
- Limpieza de listeners/tweens con `gsap.context(...).revert()` al desmontar.
