# Rediseño Apple — informe final (feat/fase1b-redesign)

Este pase sustituye al informe anterior. Codex dejó hecha la base (tokens, fuente sin serif, `.glow-border`, modo mock, `?ui-check=1`). Claude Code terminó el trabajo: verificación automática, rediseño responsive con orden de lectura claro, navegación móvil y revisión visual con capturas. Solo cambia la presentación: la lógica de negocio y las llamadas a la API siguen igual. Tampoco hay commits ni cambios en `../paliativos-backend`.

## Decisiones de diseño

| Área | Before | After | Why |
| --- | --- | --- | --- |
| Tipografía | Calistoga/Georgia en títulos, IBM Plex opcional, badges en MAYÚSCULAS | Una sola pila SF/Inter (`-apple-system … "Inter", "Segoe UI Variable" …`), escala HIG (34/28/22/20/17/15/13), tracking negativo en títulos y cifras tabulares | La tipografía serif era lo más alejado de Apple; las cifras tabulares alinean los importes |
| Ritmo y espaciado | Padding de 8–12 px, botones pegados | Rejilla de 4/8 px, tarjetas de 20–24 px, secciones separadas 24–32 px, márgenes de página de 40 px en escritorio y 16 px en móvil, ancho máximo de contenido de 1200 px | Respiro y medida de lectura; se acaban los "muros de columnas" en pantallas anchas |
| Grupos de acciones | Cinco botones del mismo peso en fila (`Registrar`, `Emitir`, `Ver…`, `Ver…`, `Actualizar`) | `ActionBar`: un botón principal relleno, hasta 2 grises y el resto en un menú `…`; en móvil, principal + "Más" (hoja de acciones iOS) | Una sola acción principal por pantalla; nunca hay botones apretados ni separaciones menores de 8 px |
| Tablas | Tablas en todos los anchos; a ≤768 px se apilaban como pares etiqueta/valor | `DataList`, un componente compartido: tabla tranquila en escritorio y tarjetas de lista agrupada iOS en ≤768 px (titular, 1–2 datos secundarios, Pill arriba a la derecha, chevron o una acción principal y las secundarias en el menú `…`) | Las tablas comprimidas en móvil se leían como columnas sin orden; usar un solo componente mantiene la coherencia |
| Maestro/detalle (Pacientes, Facturación, Episodios) | Dos columnas apretadas, también en el móvil | Escritorio: lista fija de 360 px + detalle. Móvil: lista **o** detalle con un botón atrás "‹ Pacientes" (patrón push/pop) | Una sola columna y un solo foco en el teléfono |
| Ficha del paciente | 8 paneles apilados uno tras otro | Identidad (nombre, datos, Pills) → acción principal → 4 métricas → control segmentado **Resumen · Historial · Consultas · Documentos**; se ve una sección cada vez | Orden y jerarquía legibles de un vistazo |
| Orden de lectura | Banners, cabeceras y filtros en cualquier orden | `PageHeader`: título → acción principal → filtros (fila de Pills desplazable en móvil) → contenido en secciones agrupadas con título | Se repite el mismo patrón en cada pantalla |
| Formularios | Varias columnas en móvil, botones de envío sueltos | `.form-grid` (1 columna en móvil, etiquetas encima, campos de 16 px o más) y `.form-actions`, barra de acciones fija abajo, translúcida, justo encima del tab bar | Patrón nativo de iOS; el teclado no hace zoom |
| Navegación móvil | Sidebar comprimido / hamburguesa | Tab bar inferior translúcido (`saturate(180%) blur(20px)`, safe-area): Pacientes, Episodios, Facturación, Documentos y Más (hoja con el resto) | La navegación nativa del teléfono. La app no tiene Agenda ni Epidemiología, así que se eligieron las 4 secciones existentes más usadas |
| Totales en móvil | Rejilla 2×2 de mosaicos con cifras partidas | Lista agrupada (etiqueta a la izquierda, valor a la derecha); en escritorio, mosaicos con `clamp()` + unidades de contenedor | Los importes grandes (RD$12,345,678.90) ya no se parten a mitad de número |
| Superficies | Bordes sólidos `#e2e8f0` y fondo blanco plano | Fondo agrupado `#f2f2f7` con tarjetas blancas (dark: negro y `#1c1c1e`), bordes de 1 px `rgba(0,0,0,.06)` / `rgba(255,255,255,.08)`, sombras difusas en dos capas y radios de 16–20 px | Capas tipo Ajustes/Salud |
| Rellenos | Botón gris del mismo color que el fondo (invisible) | Relleno del sistema `rgba(118,118,128,.12/.24)` en botones grises y en la búsqueda | Contraste correcto sobre el fondo agrupado |
| Brillo (glow) | `.glow-border` aplicado de forma suelta | Solo en: el botón principal de cada pantalla (hover y foco de teclado: ActionBar, "Subir documento", "Guardar cambios", "Agregar ítem", login), el campo de búsqueda **mientras tiene el foco** (`.glow-focus`) y los elementos de IA (`data-tone="ai"`: Pill de IA y aviso de revisión IA). Estático con `prefers-reduced-motion` y con `data-motion="off"` | El efecto Apple Intelligence funciona porque es poco frecuente |
| Movimiento | Entradas con GSAP y transiciones repetitivas | Entradas `scale(.96)` + opacity de 180–260 ms en ease-out, stagger de 30 ms solo en los 8 primeros elementos de lista, pulgar del segmented con transición de 260 ms, hoja de acciones desde abajo, `:active scale(.97)`; sin `transition: all` | Fluido sin estorbar el trabajo repetitivo |
| Texto dañado | La pasada de Codex escribió `?` en lugar de acentos (`?rea de trabajo`, `Men? de sesi?n`, chevron `'?'`, `mock.ts` completo) | Restaurados (`Área`, `Menú de sesión`, `›`, nombres del mock) | Daño de codificación de la sesión anterior. El script python de `data-label` no tocó ningún `.tsx` |

Componentes nuevos (`src/components/common/`): `DataList`, `ActionMenu` (popover en escritorio, hoja de acciones en móvil), `ActionBar`, `PageHeader`, `SegmentedControl` y `useMediaQuery`. En el layout: `src/app/layouts/TabBar.tsx`. Los estilos compartidos están en `src/styles/data-page.css`.

## Verificación

`npm run ui:verify` (`scripts/ui-verify.mjs`, Playwright/Chromium contra el servidor de desarrollo en `:5173`) recorre login, `?ui-check=1` y 14 estados de ruta del router (/, patients, patient-detail, patient-focus, billing, billing-detail, episodes, episode-detail, finance, documents, reports, audit, secretaries, config). Las rutas se prueban con los datos `demo` y `worst` (nombres de más de 60 caracteres, emails largos, RD$12 M), a 390, 768 y 1440 px, en light y dark.

| Comprobación | Primera ejecución | Final |
| --- | --- | --- |
| (a) Texto desbordado (sin ellipsis intencional) | 64 | **0** |
| (b) Botones/pills hermanos a < 8 px o solapados | 140 | **0** |
| (c) `font-family` serif computada | 0 | **0** |
| (d) Controles interactivos de menos de 36 px | 0 | **0** |
| (e) Scroll horizontal de página | 0 | **0** |
| (f) `<table>` visible a 390 px | (check añadido después) | **0** |
| **Total** | **204** | **0** en 180 visitas |

Reglas del check (b): las filas de una lista agrupada (cuadradas, a todo el ancho y separadas por línea fina) y los segmentos de un control segmentado o tablist cuentan como un solo control. Las barras flotantes o fijas (tab bar, barra de acciones de formulario) no se comparan con el contenido que pasa por debajo. Para que las capturas sean estables, el contexto usa `reducedMotion: "reduce"`.

- `npx tsc --noEmit`: OK.
- `npm run build`: OK. El modo mock no entra en el bundle de producción: `dist/` no contiene "Datos de ejemplo" ni "Mock sin fixture".

## Modo mock (solo desarrollo)

Con `npm run dev` en marcha:

- `http://localhost:5173/?mock=1` abre la app con sesión y datos simulados.
- `&data=worst | empty | one | huge` cambia el conjunto de datos. También se cambia desde la barra "Datos de ejemplo", abajo a la derecha, que además tiene "Cambiar tema".
- `http://localhost:5173/?ui-check=1` abre la página de prueba de Pills.
- Se activa solo con `import.meta.env.DEV`: no persiste nada y solo admite peticiones GET.

## Capturas recomendadas (`.ui-shots/`, en .gitignore)

- `1440-light-patient-detail.png`: maestro/detalle, ActionBar, métricas y control segmentado.
- `390-light-patient-focus.png` y `390-light-patient-focus-worst.png`: ficha en móvil (atrás → identidad → acción → métricas → secciones) con un nombre de 70 caracteres.
- `390-light-patients.png`: lista agrupada con tab bar.
- `1440-light-documents.png` / `390-light-documents.png`: pasos 1–2, zona para soltar archivos y tabla que pasa a tarjetas.
- `390-light-finance-worst.png`: totales como lista agrupada con importes de RD$37 M.
- `1440-light-billing-detail.png`, `390-dark-episodes.png` y `1440-light-login.png`.

## Pendiente y notas

- La tab bar y las hojas de acciones están probadas en Chromium emulado. Antes de dar por cerrado el trabajo en móvil, hay que probar en un iPhone real (safe areas, teclado, rebote al hacer scroll).
- En `src/services/endpoints/clinical.ts` y `src/types/api.ts` siguen los cambios de la fase 1B anterior (`consultation_date`, alineado con el backend). En este pase no se tocaron.

---

# Fase 1–3 en el frontend: Epidemiología, Asistente IA, Resumen IA y línea de tiempo

Contrato: `../paliativos-backend/API_CHANGES.md` (Fase 1 + `/epi/*` + `/ai/*`). Los hallazgos usan la forma agrupada por categoría de enfermedad (`categories[]` con `insights[]`) que pidió el dueño. Cuando el backend publique ese cambio en API_CHANGES.md hay que comprobar que coincide con `src/types/clinical.ts`.

## Rutas nuevas

| Ruta | Permiso | Qué es |
| --- | --- | --- |
| `/epidemiologia` | `epi:read` (médico, admin) | Filtros en la URL (`period`, `from`, `to`, `doctor`, `sex`, `age`, `chapter`, `code`, `cat`, `codes`, `dx`, `ask`), KPIs con NumberFlow, hallazgos IA por categoría, tendencia (recharts), top 10, pirámide edad/sexo, capítulo, médico, drill-down y "Pregúntale a tus datos" |
| `/consultations/:id` | `clinical:read` | Editor SOAP con autoguardado (`version`, 409 → toast con "Recargar"), CIE-10 con cmdk, códigos que se pueden quitar, diagnóstico principal, firmar, enmiendas y "✦ Preparar nota con IA" |
| `/equipo` | `staff:manage` (admin) | `/admin/staff`: alta con acceso, activar o desactivar y contraseña temporal que se muestra una sola vez |
| Ficha → Resumen | `clinical:read` + `ai:use` | Tarjeta "Resumen clínico ✦ IA": narrativa con refs `[C1]` que enlazan a la consulta, condiciones activas como code pills, eventos recientes, aviso legal y botón "Regenerar" |
| Ficha → Historial / Consultas | — | Línea de tiempo agrupada por día (formato nuevo, con soporte de `redacted`). Consultas desde `/consultations/patient/{id}`. "Nueva consulta" crea un borrador y abre el editor |

La guarda está en `src/utils/usePermission.tsx` (`usePermission` y `RequirePermission`). El sidebar y el tab bar ocultan lo que el rol no puede usar. En el tab bar de médico y admin, Epidemiología sustituye a Episodios, que pasa a "Más" porque las consultas y la línea de tiempo ya cubren los eventos clínicos. Las secretarias conservan las pestañas que tenían.

## Decisiones

| Área | Decisión | Por qué |
| --- | --- | --- |
| Hallazgos IA | Una fila de pills por categoría (con recuentos) y una tarjeta por categoría: total, delta, sparkline de 12 semanas y filas compactas (severidad + título + métrica grande + códigos). La explicación va en una línea secundaria de 2 líneas como máximo | Sustituye al muro de texto. Al pulsar una categoría se filtra todo el panel por su rango CIE-10 (`chapter=C00-D49`); al pulsar un código se abre el drill-down |
| Brillo IA | Solo en el pill "✦ IA" del encabezado, en el borrador del asistente y en el resumen del paciente. Las tarjetas por categoría no brillan | La regla de "a veces" |
| Severidad | info = gris con ⓘ, vigilar = `#fab219`, alerta = `#d03b3b` (paleta de estado de dataviz). El color va en el icono y en un fondo tenue; el texto, siempre en tinta | El estado nunca se comunica solo con color |
| Gráficos | Ranuras categóricas de dataviz validadas con `validate_palette.js`: CVD adyacente ΔE 9,1 en claro y 8,4 en oscuro. Líneas de 2 px, área al 10 %, rejilla fina, tooltip con cruceta, leyenda con ≥ 2 series y "Ver tabla" como alivio de contraste. En móvil los ejes son más simples (3 marcas en Y y menos etiquetas en X) | Método de dataviz |
| Asistente IA | Escritorio: comparación "Tu nota | Propuesta de IA" por sección (Aceptar, Editar, Descartar) y tarjetas CIE-10 con justificación, cita de evidencia y Agregar/Descartar. Móvil: un paso por sección con puntos de progreso y una barra fija abajo con Descartar/Aceptar; el editor se oculta mientras se revisa | No se guarda nada hasta "Aplicar a la nota" (`/ai/suggestions/{id}/accept` con `version`; las secciones descartadas se envían como `""` para que el backend no las escriba). "Descartar todo" → `/reject` |
| Dictado | 🎙 usa Web Speech API si está disponible (Chrome/Safari). Si no, aparece desactivado con "Próximamente" | El navegador lo trae; no hace falta ninguna dependencia |
| Hojas | `Sheet` nuevo en `components/common`: panel lateral en escritorio y hoja inferior con grabber en móvil | Filtros CIE-10, período personalizado, drill-down, firmar y alta de equipo |

Dependencias nuevas: `recharts`, `cmdk` y `@number-flow/react`.

## Modo mock

`src/dev/mockClinical.ts` genera una cohorte sintética con semilla (40 pacientes, 3 médicos y unas 430 consultas en 13 meses, más un brote de neumonía reciente) y calcula `/epi/*` como lo hace el backend, así que todos los filtros cambian las cifras. También cubre el SOAP en memoria (comprobación de versión y 409), los diagnósticos, el catálogo CIE-10 (subconjunto paliativo), la línea de tiempo, el staff y la IA: borrador por reglas, resumen del paciente, `ask` con las intenciones top/trend/summary/breakdown/insights e insights por categoría. Con `?role=doctor|secretary` se prueban las guardas. El modo mock sigue fuera del bundle de producción.

Enlaces útiles: `/epidemiologia?mock=1`, `…&ask=¿Qué diagnósticos aumentaron este mes?`, `…&dx=C34.9`, `/consultations/consultation-1?mock=1&ai=review`, `/patients?mock=1&patientId=patient-1&focus=1&tab=history`, `/equipo?mock=1`.

## Verificación

- `npm run ui:verify`: 15 estados de ruta nuevos (epi, epi-filtered, epi-drill, epi-ask, epi-ask-trend, epi-ask-insights, epi-category, epi-secretary, consultation, consultation-compose, consultation-ai, consultation-signed, patient-history, patient-consults, equipo) × demo/worst × 390/768/1440 × claro/oscuro. **0 incidencias en 360 visitas** (la primera ejecución sobre las rutas nuevas dio 116).
- `npx tsc --noEmit` y `npm run build`: OK. `dist/` no contiene fixtures del mock.
- Capturas: `1440-light-epi.png`, `390-light-epi.png`, `1440-light-epi-ask-insights.png`, `1440-light-consultation-ai.png`, `390-light-consultation-ai.png`, `1440-light-patient-focus.png` (resumen IA) y `390-light-patient-history.png`.

## Pendiente

- Comparar `AiEpiInsights` / `AiEpiAnswer.categories` con el API_CHANGES.md definitivo. `evidence_query` está tipado como `unknown` y todavía no se usa.
- El bundle pasa de 1 MB (recharts). Conviene cargar `/epidemiologia` con `lazy()` en una ruta aparte.

---

# Transcripción de audio de la consulta (grabadora real)

Contrato: `POST /ai/consultations/{id}/transcribe` (multipart) y `GET /ai/transcription/config` en `../paliativos-backend/API_CHANGES.md`. El dictado con Web Speech y el "Próximamente" desaparecen; ahora se graba con `MediaRecorder` y transcribe el backend.

| Área | Decisión | Por qué |
| --- | --- | --- |
| Consentimiento | Antes de abrir el micrófono, una hoja "Grabar la consulta" con la casilla **"El paciente autoriza grabar la consulta"**. "Empezar a grabar" se activa solo con la casilla marcada. Cada fragmento se envía con `consent=true` | El backend rechaza sin consentimiento (`CONSENT_REQUIRED`); la UI no deja llegar a ese punto |
| Grabación | Pill flotante (sticky abajo): punto rojo, temporizador `tabular-nums`, coste estimado en vivo, medidor de nivel de 5 barras (`AnalyserNode`, rAF a 20 fps; 4 fps y sin transición con movimiento reducido; solo `transform`), Descartar, Pausa/Reanudar y "Transcribir". Mientras graba lleva el brillo IA suave (`.glow-border[data-tone="ai"]`); en pausa se apaga | Un solo foco y el brillo marca que la IA está escuchando, sin saturar |
| Fragmentos | `audio/webm;codecs=opus` → `ogg` → `audio/mp4` (Safari), 32 kbps mono. Cada 10 min de audio grabado (sin contar pausas) se arranca un `MediaRecorder` nuevo sobre el mismo stream **antes** de parar el anterior: cada fragmento es un archivo decodificable (~2,4 MB) y no hay huecos. Se suben en orden (`chunk_index`, `final` en el último, `session_id` del primero) con progreso agregado por bytes; "Enviando audio… 42 %" pasa a "Transcribiendo…" cuando el fragmento ya salió. Cada fragmento se reintenta una vez ante error de red o del proveedor | Muy por debajo del límite de 25 MB sin depender de ffmpeg en el servidor |
| Transcripción | Tarjeta "Transcripción de la consulta" con `textarea` editable, "4 min 12 s · ≈ US$0.013" discreto y **"✦ Preparar nota con IA"**, que llama a `draft-note` con `source: "transcript"` y el texto editado. El "✦ Preparar nota con IA" del encabezado abre la hoja ya rellena con la transcripción | El médico corrige antes de que la IA estructure la nota |
| Móvil | Botón grande "Grabar consulta" (56 px) en una barra fija abajo, translúcida, justo encima del tab bar (que ya lleva el safe area) con `env(safe-area-inset-left/right)`. Durante la grabación la barra pasa a dos filas: estado + medidor + descartar arriba y Pausa / Transcribir grandes abajo | Alcance del pulgar; a 390 px una fila no cabía |
| Errores (sonner) | Permiso denegado, sin micrófono, micrófono ocupado, navegador sin `MediaRecorder`, contexto no seguro (http), sin conexión, `TRANSCRIPTION_UNAVAILABLE`, `AI_DISABLED`, `AUDIO_TOO_LARGE`, `UNSUPPORTED_AUDIO`, `CHUNK_SEQUENCE`, nota firmada, 403. Los errores recuperables conservan el audio en memoria con "Reintentar envío" (en el toast y en la tarjeta) | Nunca se pierde una consulta por un corte de red |
| Disponibilidad | Solo en borradores, con `ai:use` + `clinical:write` y si `/ai/transcription/config` dice `available`. Si no, el botón queda desactivado con la explicación "La transcripción de audio no está configurada en este servidor." | Sin promesas falsas |
| Privacidad | El audio solo vive en memoria del navegador hasta enviarse; al parar o salir se cierran las pistas del micrófono y el `AudioContext`. Aviso `beforeunload` mientras graba o envía | |

Archivos: `components/useAudioRecorder.ts` (grabadora y rotación), `components/transcription.ts` (subida por fragmentos, mensajes, formato), `components/ConsultationRecorder.tsx` (consentimiento, pill, barra móvil, tarjeta), `AiComposeSheet.tsx` (sin Web Speech), `ConsultationPage.tsx/.css`, `services/endpoints/ai.ts`, `types/clinical.ts`.

## Modo mock

`?mock=1` simula `/ai/transcription/config` y `/transcribe`: convierte el `FormData`, emite progreso de subida en 4 pasos, valida consentimiento/sesión/borrador y devuelve una transcripción paliativa sintética (coste = duración/60 × 0,003). Con micrófono real también funciona de punta a punta. Vistas deterministas sin micrófono (solo DEV): `/consultations/consultation-1?mock=1&rec=consent | recording | paused | uploading | transcript`.

## Verificación

- `npm run ui:verify`: 5 estados nuevos (`consultation-rec-consent`, `consultation-recording`, `consultation-rec-paused`, `consultation-rec-uploading`, `consultation-transcript`). La primera pasada dio 12 desbordes a 390 px (pill en una fila); tras el diseño en dos filas, **0 incidencias en las 420 visitas** de la pasada completa.
- `npx tsc --noEmit` y `npm run build`: OK. `dist/` no contiene el mock ni la transcripción sintética.
- Pendiente: probar en iPhone real (Safari graba `audio/mp4`; permisos del micrófono y bloqueo de pantalla durante consultas largas).

---

# Reorganización UX: primero las alertas

El dueño dijo que se veía bien pero estaba todo tirado, y quienes usan la app no son expertos en tecnología. Este pase reordena la app para que cada pantalla responda de un vistazo "¿qué hago primero?". Se mantiene el sistema Apple (tokens, `PageHeader`, `ActionBar`, `DataList`, `Sheet`, `SegmentedControl`). No hay commits ni cambios en `../paliativos-backend`.

## Antes / después

| Pantalla | Antes | Después | Por qué |
| --- | --- | --- | --- |
| Pantalla inicial | `/` abría Pacientes con un panel vacío "Selecciona un paciente" | `/` es **Inicio**. Arriba, las **alertas** agrupadas en Requiere atención / Para vigilar / Para tu información (esta última plegada); cada tarjeta trae el número, hasta 3 pacientes y luego "y N más", y **un solo** botón de acción. Después, **Hoy**: notas por firmar con "Firmar", seguimientos de la semana y pacientes recientes. Por último, **Tu práctica en números**: KPIs con NumberFlow, actividad, edades, calidad de datos con una acción por punto, uso de la IA y carga por médico (solo admin) | Lo primero que se ve son las alertas y el trabajo del día |
| Navegación | 10 entradas en el sidebar, el título "Área de trabajo" y un menú hamburguesa | 5 entradas: **Inicio, Pacientes, Epidemiología, Facturación, Administración**, con el logo y el nombre de la app. En el móvil, la tab bar tiene Inicio, Pacientes, Epidemiología, Facturación y **Más** (hub de Administración y Cerrar sesión) | Menos opciones; la marca sustituye a un título que no decía nada |
| Administración | Secretarias, Equipo, Trazas, Reportes, Movimientos y Ajustes, cada uno por separado | `/admin` es un hub con filas agrupadas al estilo de Ajustes de iOS: Equipo · Documentos · Reportes · **Registro de actividad** · Ajustes visuales. Movimientos pasa a ser una pestaña de Facturación (`/finance` → `/billing?tab=movimientos`). `/secretaries` → `/equipo?role=secretary` | Lo administrativo queda en un solo sitio |
| Concepto de visita | "Registrar episodio" era la acción principal y Episodios estaba en el menú | La única acción principal es **"Nueva consulta"**. Emitir factura, Ver facturación, Registrar episodio, Actualizar notas y Ver documentos pasan al menú "…". Los episodios se ven en Historial, solo lectura, como "Episodios anteriores" | Una sola manera de registrar una visita |
| Ficha del paciente | Saldo en la cabecera, 4 métricas de dinero y conteos, finanzas en Resumen, `active`/`female` | Cabecera con nombre; edad · sexo · documento · médico; **diagnósticos CIE-10 activos** como pills y **las alertas de ese paciente** con su acción. Pestañas Resumen \| Historial \| Consultas \| Documentos \| **Finanzas**; el dinero solo aparece en Finanzas | Primero lo clínico |
| Resumen IA | Un párrafo denso, con "(2 registro(s))" y chips a mitad de frase | Viñetas bajo Condiciones activas, Eventos recientes y Medicación, con "En 2 consultas · última …"; la fuente `[C1]` va al final de la línea y enlaza a la consulta | Se lee de un vistazo |
| Editor de consulta | "Firmar nota" arriba, junto a IA y Grabar; textareas con tirador | Tres columnas: **contexto del paciente** (edad/sexo, diagnósticos activos, última consulta, medicación y alergias; plegable, y en el móvil una tarjeta que se despliega), **la nota como documento** (títulos, textareas que crecen, "Guardado ✓") y el **panel CIE-10**, que no se mueve al hacer scroll. Arriba, **Grabar consulta / ✦ Preparar nota con IA** con los pasos "Graba → Revisa la transcripción → La IA ordena la nota → Tú firmas". **Firmar nota va al final** (y en la barra fija del móvil); queda desactivado y muestra "Falta: …" hasta que haya Motivo, Evaluación, Plan y al menos un CIE-10 | Escribir la nota en orden, de grabar a firmar |
| Epidemiología | Muro de tarjetas, "+700 %" con 1 → 8 casos, umbral/media/DE a la vista y curvas monótonas | Orden: **Lo importante** (3 hallazgos en lenguaje llano, cada uno con una acción) → KPIs → 1 hallazgo por categoría con "Ver más" → tendencia (líneas rectas) → distribución → **Más análisis** (estacionalidad mes × categoría en 12 meses, comparación por médico, seguimiento de la práctica) → Pregúntale a tus datos. Con menos de 5 casos se muestra "9 casos (antes 1)" en lugar del porcentaje. El método queda en **¿Cómo se calculó?** | Se entiende sin saber estadística |
| Equipo | Dos pantallas (Secretarias y Equipo) y un formulario único | Una sola lista con Todos \| Médicos \| Secretarias \| Admin. **Agregar profesional** abre un formulario que cambia según el rol: el médico pide especialidad y exequátur; la secretaria, el médico asignado; la contraseña tiene botón "Generar". Al terminar, una hoja **"Ya puede entrar"** muestra email y contraseña con botón de copiar. Se marca al médico inactivo que todavía tiene pacientes | Roles y permisos claros |
| Idioma | `active`, `female`, `issued`, `extracted`… | Un solo mapa, `src/utils/labels.ts` (`label(kind, value)`), en todas las pantallas. Si llega un valor desconocido se humaniza; nunca se muestra la clave en inglés | Español en todas partes |
| Estados vacíos | Un icono y "Sin registros" | Cada estado vacío dice el siguiente paso ("Aún no hay consultas. Crea la primera con Nueva consulta"). `Empty` y `Error` aceptan una acción | Enseñan qué hacer |

## Rutas de las alertas

- `/patients?filter=overdue_followup|unsigned_drafts|missing_diagnosis`: pill removible ("Sin seguimiento · 7"); la lista se filtra a los pacientes que nombra la alerta y avisa "Mostrando 5 de 7" cuando nombra menos que su total.
- `/billing?status=overdue`: pill "Vencidas (+30 días)".
- `/epidemiologia?category=…&date_from=…&date_to=…`: se aplica como filtro de categoría con período personalizado.
- `/equipo?staffId=…`: abre la ficha de ese miembro.
- `/consultations/{id}` y `/patients?patientId=…`: abren directamente.

## Requisitos del médico → dónde se cumplen

| # | Requisito | Pantallas |
| --- | --- | --- |
| 1 | Fácil para personas con poca experiencia tecnológica | 5 entradas de navegación; Inicio dice por dónde empezar ("Empieza por el botón azul de la primera alerta"); una acción principal por pantalla; lenguaje llano; estados vacíos que enseñan |
| 2 | La IA toma notas en la consulta, sin copiar y pegar, y las ordena en la historia | Consulta: **Grabar consulta** → transcripción editable → **✦ Preparar nota con IA** → revisión por sección → se aplica al SOAP y al CIE-10 de esa consulta |
| 3 | Escribir la nota de forma natural y centralizada | Consulta: la nota como documento, contexto a la izquierda, CIE-10 a la derecha, autoguardado "Guardado ✓", Firmar al final |
| 4 | Agregar y gestionar médicos | Administración › Equipo: filtro Médicos; "Agregar profesional" con especialidad y exequátur; restablecer contraseña; desactivar/reactivar; aviso de médico inactivo |
| 5 | Secretarias con roles y permisos correctos | Equipo › Secretarias: médico asignado obligatorio y editable. La secretaria solo ve Inicio (seguimientos), Pacientes y Facturación; nada de epidemiología, IA ni datos clínicos |
| 6 | Catálogo CIE-10 con búsqueda, en lugar de texto libre | Panel CIE-10 (cmdk) en Consulta; filtros y "Comparar código" en Epidemiología |
| 7 | Diagnósticos estructurados (código + nombre) | Code pills en Consulta, cabecera del paciente, Resumen IA e Historial |
| 8 | Información epidemiológica automática | Epidemiología (Lo importante, categorías, estacionalidad, por médico) y alertas `epi_spike` en Inicio |
| 9 | Menos sesgos y errores por texto libre | Inicio › Calidad de los datos (% con CIE-10, % firmadas, texto libre por migrar, notas incompletas, duplicados; cada punto con su acción). Firmar exige al menos un CIE-10. Epidemiología solo cuenta datos codificados |
| 10 | Historia clínica ordenada: cada consulta queda en el paciente | Ficha › Historial (línea de tiempo + Episodios anteriores) y Consultas; Resumen IA con fuentes `[C1]` que abren la consulta |

## Modo mock

- `src/dev/mockDashboard.ts` cubre los 5 endpoints `/dashboard/*` con todos los tipos de alerta: `unsigned_drafts`, `frequent_visits`, `new_symptoms`, `inactive_staff`, `overdue_followup`, `epi_spike`, `unpaid_invoices` y `missing_diagnosis`.
- Respeta el alcance por rol: con `?role=doctor` no hay alertas de facturación ni de personal; con `?role=secretary` solo aparece `overdue_followup` y kpis/activity/quality devuelven 403.
- Admite `data=worst|empty`, y los KPIs cuadran con la serie de actividad.
- `mockClinical.ts` usa las claves de categoría del backend (`neoplasms`, `respiratory`…) y el filtro `category`; incluye un usuario admin y un médico inactivo (`user-doc-4`).
- `mock.ts` tiene 7 pacientes, una alergia y facturas de 3 a 74 días de antigüedad.

## Verificación

- `npx tsc --noEmit` y `npm run build`: OK. `dist/` no contiene el mock.
- `npm run ui:verify` añade estas rutas: home, home-doctor, home-secretary, admin, patients-filter, billing-overdue, billing-movimientos, patient-finance, equipo-secretaries y epi-alert-link. Resultado: **0 incidencias en 504 visitas** (demo y worst, 390, 768 y 1440 px, claro y oscuro), sin errores de página. La primera pasada de cada pantalla nueva tuvo incidencias que ya están corregidas.

## Pendiente / TODO de backend

- **Lista completa detrás de una alerta.** Hoy cada alerta nombra como máximo 5 pacientes. Haría falta `GET /dashboard/alerts/{id}/patients` o `GET /patients?filter=overdue_followup`.
- **Facturas vencidas.** Se calculan en el navegador sobre las 50 primeras. Haría falta `status=overdue` en el servidor.
- **Episodios de un paciente.** Se filtran en el navegador sobre 100 episodios. Haría falta un filtro `patient_id` en `/episodes`.
- **Pacientes nuevos frente a recurrentes en Epidemiología.** Haría falta `GET /epi/breakdown?by=patient_type` (primera visita histórica). Por ahora, "Pacientes nuevos y en seguimiento" usa `/dashboard/kpis`.
- **Pares de diagnósticos que aparecen juntos.** No se construyó, porque ningún endpoint da los códigos de cada consulta; tampoco se simula. Haría falta `GET /epi/co-occurrence?limit=10`.
- **Prueba en móvil real.** Falta probar en un iPhone real: barras fijas de Firmar/Grabar, la hoja de contexto y el teclado.

---

# Menos scroll ("tenemos scroll excesivo")

Pase de compactación: no se quitó información; lo secundario pasa a pestañas, disclosures u hojas. Sistema Apple intacto (tokens, `SegmentedControl`, `Sheet`, `DataList`). Sin commits ni cambios en el backend.

## Antes / después (altura de página, datos demo, tema claro)

| Pantalla | 1440 antes | 1440 después | 390 antes | 390 después |
| --- | --- | --- | --- | --- |
| **Inicio** (admin) | 3552 px (3,9×) | **1373 px (1,5×)** | 6933 px (8,2×) | **2568 px (3,0×)** |
| Epidemiología | 5094 px (5,7×) | 1837 px (2,0×) | 7429 px (8,8×) | 3022 px (3,6×) |
| Ficha › Resumen | 2131 px (2,4×) | 1933 px (2,1×) | 2909 px (3,4×) | 2408 px (2,9×) |
| Ficha › Historial | 2516 px (2,8×) | 1926 px (2,1×) | 3332 px (3,9×) | 2540 px (3,0×) |
| Consulta (editor) | 1700 px (1,9×) | 1267 px (1,4×) | 2080 px (2,5×) | 1700 px (2,0×) |
| Consulta › revisión IA | 4115 px (4,6×) | 2591 px (2,9×) | — | — |
| Ajustes visuales | 3308 px (3,7×) | 1101 px (1,2×) | 4026 px (4,8×) | 1493 px (1,8×) |

## Qué cambió

| Pantalla | Cambio |
| --- | --- |
| Inicio · Alertas | Filas de una línea dentro de una tarjeta, agrupadas por severidad: icono de severidad (nunca solo color), título, contador, nombres de pacientes truncados con elipsis y **una** acción (toda la fila es el botón; la primera alerta lleva la acción azul con glow). Se muestran las 5 primeras por severidad; "Ver todas (N)" en la cabecera abre un `Sheet` con todas, con detalle y notas por paciente. En el móvil la acción es un chevron (la primera, círculo azul) |
| Inicio · Hoy | Una sola tarjeta con tres listas cortas (Notas por firmar · Seguimientos esta semana · Pacientes recientes), máximo 3 filas; "Ver más (N)" despliega el resto en el sitio. En el móvil las tres listas se apilan dentro de la misma tarjeta |
| Inicio · Números | KPIs siempre visibles y compactos (cifra + delta + nota en una línea). `SegmentedControl` **Resumen \| Actividad \| Calidad \| IA \| Equipo** (Equipo solo admin) en la cabecera de la sección; un panel cada vez, en la URL (`?panel=actividad`). Resumen = actividad compacta + "Por revisar" (hasta 3 puntos de calidad abiertos con su acción, "Ver todo" → Calidad) |
| Epidemiología | Arriba fijo: filtros, **Lo importante** y KPIs (más compactos). Debajo, `SegmentedControl` **Resumen \| Tendencias \| Diagnósticos \| Distribución \| Hallazgos IA** (`?view=`; en 390 px etiquetas cortas Códigos / Grupos / IA). Resumen = tendencia + top 5 ("Ver los 10" → Diagnósticos); Tendencias = tendencia + estacionalidad + flujo de pacientes; Distribución = edad/sexo/capítulo + comparación por médico (admin). "Ver tendencia" desde Lo importante cambia a Tendencias. "Pregúntale a tus datos" sigue al final, con las sugerencias en una fila deslizable |
| Consulta | Ritmo más compacto. Las secciones opcionales vacías (Enfermedad actual, Antecedentes, Examen físico) se pliegan a una fila "+ Añadir examen físico" que al pulsarse abre la sección y enfoca el campo; las obligatorias para firmar siempre están visibles. En notas firmadas, las vacías se ven como "Examen físico · Sin registrar" en una línea. La columna de contexto del paciente y el panel CIE-10 son `sticky`. Mientras se revisa el borrador IA, el editor se oculta también en escritorio (la columna "Tu nota" ya lo muestra) y las secciones vacías en tu nota muestran la propuesta a todo el ancho |
| Ficha del paciente | Resumen: Datos clave muestra Edad, Sexo, Alergias y Medicación; contacto y datos administrativos tras "Ver contacto y datos administrativos". Historial: la línea de tiempo queda abierta; Historial médico, Medicación activa, Reconciliaciones y Episodios anteriores son disclosures de una línea con su recuento ("Agregar condición" / "Nueva prescripción" siguen visibles y abren la sección). En el móvil los CIE-10 activos son una fila deslizable |
| Ajustes visuales | `SegmentedControl` Tema \| Color \| Componentes \| Sistema |

`SegmentedControl` acepta `short` (etiqueta para ≤ 480 px; el nombre completo queda como `aria-label`).

## Verificación

- `ui-verify` añade el check **(g) page too tall**: falla si Inicio (`home*`) mide más de 1,6× el alto del viewport en escritorio (≥ 1024 px), y al final imprime la altura de cada ruta (px y viewports) a 390/768/1440. Las alturas también quedan en `.ui-shots/report.json` (`heights`).

---

# Nuevo paciente y Nueva consulta desde cualquier pantalla

El dueño no encontraba cómo agregar pacientes: `POST /patients` existía pero ninguna pantalla lo usaba (solo entraban pacientes por documentos con autoextracción).

| Área | Decisión |
| --- | --- |
| Dónde | **Pacientes**: botón principal "+ Nuevo paciente" en la cabecera de la lista; estado vacío "Aún no hay pacientes. Agrega el primero con «Nuevo paciente»" con el botón. **Inicio**: acciones rápidas **Nueva consulta** (principal, solo con `clinical:write`) y **Nuevo paciente**. **Barra superior**: "+ Nuevo" (menú: Nueva consulta / Nuevo paciente; en el móvil, icono "+"). **Más** (tab bar): Nueva consulta y Nuevo paciente arriba. Un solo `QuickActionsHost` en `AppLayout` aloja la hoja y el selector; `?quick=new-patient` y `?quick=new-consultation` los abren por enlace |
| Formulario | `Sheet` de una columna, etiquetas arriba, campos de 16 px. Obligatorios: Nombre(s), Apellidos, Documento, Fecha de nacimiento, Sexo (radios segmentados). "Más datos" (plegado): teléfono, otro teléfono, dirección, aseguradora, médico asignado (admin elige de la lista; médico y secretaria ven el suyo, el backend lo fija) y notas. Campos según `PatientCreate` del backend (`first_name`, `last_name`, `document_number`, `birth_date`, `gender` female/male/other/unknown, …). Nombre y apellidos van separados porque el backend los guarda así |
| Validación | En español bajo cada campo (`aria-invalid`, foco al primer error): obligatorios, fecha no futura ni anterior a 1900, documento de ≥ 4 caracteres, teléfonos válidos |
| Duplicados | Antes de guardar (y al salir del campo documento) se busca en la lista de pacientes del usuario (páginas de 100; no hay búsqueda en servidor): mismo documento sin guiones/espacios → bloquea con "Ya existe un paciente con este documento: … Abrir su ficha"; mismo nombre + fecha de nacimiento → aviso con enlace y "Crear de todas formas". Un 409 del servidor se muestra igual |
| Al guardar | Toast "Paciente creado" con acción **Iniciar consulta**, se abre la ficha (cuya acción principal es "Nueva consulta"). Si se creó desde el selector de Nueva consulta, se crea el borrador y se abre el editor directamente |
| Desde foto | "Crear desde foto de cédula o documento": con `ai:use` abre el Asistente con la petición escrita (adjuntar/cámara desde el composer); sin IA pero con `documents:write`, va a Documentos (subida con autoextracción). Sin ninguno de los dos no se muestra |
| Nueva consulta | Hoja con búsqueda cmdk por nombre o documento (sin acentos ni guiones), edad y documento en cada fila; al elegir se crea el borrador de hoy y se abre el editor; al final "+ Nuevo paciente «texto buscado»" |
| Permisos | `patients:write` (admin, médico y secretaria, como en el backend; se añadió a la secretaria en el mapa de respaldo del frontend) y `clinical:write` para Nueva consulta |

Archivos: `src/modules/patients/quick/` (`store.ts`, `useQuick.ts`, `NewPatientSheet.tsx`, `PatientPicker.tsx`, `QuickActionsHost.tsx`, `quick.css`), más `AppLayout`, `TopBar`, `TabBar`, `HomePage`, `PatientsPage`, `PatientList`. Mock: `POST /patients` en memoria con 409 por documento repetido; `POST /consultations` ya existía.

`ui-verify`: `new-patient`, `new-patient-check` (DEV `&np=check`: documento repetido + errores de validación), `new-patient-secretary`, `new-consultation`, `patients-empty`.

---

# Asistente (chat con agente)

Contrato: `../AGENT_CHAT_CONTRACT.md` y la sección agent de `../paliativos-backend/API_CHANGES.md` (multipart `files[]`, `GET /agent/attachments/{file_ref}` para miniaturas del historial, `apply_extraction` con `file_ref` y `document_id: null`, `reject` con `{reason}`). El backend local en :8000 aún no tenía `/agent` en esta sesión (404), así que el camino SSE real está escrito contra el contrato pero sin probar de punta a punta.

| Área | Decisión |
| --- | --- |
| Entradas | Botón **"✦ Asistente"** en la barra superior (tinte IA, glow en hover/foco, atajo **Ctrl/⌘ K**). La navegación sigue en 5 entradas; en el móvil, botón en la barra superior y fila en **Más**. En la ficha del paciente, **"✦ Preguntar al asistente"** abre el chat con ese paciente como contexto (`openAssistant({ patientId, patientName, prompt? })` en `src/modules/assistant/store.ts`) |
| Superficies | Escritorio: panel derecho redimensionable (360–720 px, 420 por defecto, recordado por navegador) que flota sobre la página o, a ≥ 1680 px, ocupa su propia columna; botón para expandir a **/asistente** (historial a la izquierda). Móvil: hoja a pantalla completa (100dvh, safe areas) |
| Composer | Textarea que crece, adjuntar imágenes/PDF (varios; máx. 5 × 10 MB, errores en español), arrastrar y soltar en escritorio, cámara en móvil (`accept="image/*" capture="environment"`), pegar imágenes, miniaturas con quitar, Enter envía / Mayús+Enter salto de línea, **Detener** (AbortController) |
| Mensajes | Markdown propio y seguro (React, sin HTML crudo; enlaces solo internos o http(s)); chips de herramienta "Buscando pacientes…" → ✓ / error; bloques: tabla → `DataList` (tarjetas en móvil), gráfico → recharts pequeño (líneas 2 px, leyenda con ≥ 2 series, tooltip), paciente → tarjeta con code pills y "Ver ficha", códigos → pills, extracción → campos con nivel de confianza en texto (Alta/Media/Baja, no solo color) y la miniatura al lado |
| Propuestas | Tarjeta con **"✦ IA · Pendiente de confirmación"**, resumen claro de qué se escribirá, campos editables ("Corregir antes" en las largas), **Confirmar / Descartar**; tras confirmar muestra el resultado con enlace al documento, paciente o consulta; estados aplicada y descartada |
| Historial | Nueva conversación, título del primer mensaje, borrar, cargar con `GET /conversations/{id}` |
| Vacío | Sugerencias según rol (médico/admin: foto de laboratorio, pacientes sin seguimiento, "Resume a {paciente}", diagnósticos que aumentaron; secretaria: solo no clínicas) |
| Accesibilidad | Foco al abrir y vuelta al disparador al cerrar, Escape cierra, `role="log"`, región `aria-live="polite"` con anuncio del texto en tramos (no por token) |
| Errores | `sonner` en español con **Reintentar** (red, 403, IA desactivada, archivo grande o no admitido) |

Archivos: `src/modules/assistant/**`, `src/services/endpoints/agent.ts`, `src/types/agent.ts`, `src/dev/mockAgent.ts`; cableado en `src/app/layouts/` (TopBar, TabBar, AppLayout, NotificationToaster: los toasts suben mientras el chat está abierto) y la ruta `/asistente`.

## Modo mock

`?mock=1` simula el SSE con latencias reales: evento `conversation`, chips de herramienta, texto en deltas, bloques y propuestas según la intención ("seguimiento" → tabla; "aumentaron/diagnósticos" → gráfico + códigos; "resume"/nombre → tarjeta de paciente; adjunto → `read_attachment` + extracción + `apply_extraction` y `attach_document`; "crear paciente" → `create_patient`; "nota/consulta" → `draft_consultation_note`). Confirmar/descartar, lista, detalle y borrado en memoria. Vistas deterministas (solo DEV): `/asistente?mock=1&demo=chat`, `/?mock=1&assistant=open`, `/patients?mock=1&assistant=open&demo=chat`, `/asistente?mock=1&role=secretary`.

## Verificación (los dos pases)

- `ui-verify`: rutas nuevas `home-panel-quality`, `home-panel-team`, `epi-view-trends`, `epi-view-distribution`, `epi-view-insights`, `assistant-empty`, `assistant-chat`, `assistant-panel`, `assistant-panel-chat`, `assistant-secretary`. `visible()` ahora ignora lo que quedó desplazado fuera de un scroller interno (log del chat, cuerpo de hojas), que antes contaba como "pegado" a la cabecera.
- Pasada completa final (los tres pases): **0 incidencias en 684 visitas** (demo/worst × 390/768/1440 × claro/oscuro), sin errores de página. Inicio a 1440: 1373 px (1,5×), también con datos `worst` y con cada panel ≤ 1,6×.
- `npx tsc --noEmit` y `npm run build`: OK. `dist/` no contiene el mock.

## Pendiente

- Probar contra el backend reiniciado con `/agent` (SSE real, miniaturas por `/agent/attachments`).
- iPhone real: cámara, teclado sobre el composer, safe areas de la hoja, barras fijas.
- Revisión IA de la consulta sigue en ~2,9× en escritorio con 6 secciones + 5 códigos (es un flujo de revisión; ya se ocultó el editor durante la revisión).
