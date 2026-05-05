# Sistema de Tema (Frontend)

## Qué se implementó

- Proveedor real de tema con persistencia en `localStorage` (`app_theme`).
- Atributo `data-theme` aplicado en `document.documentElement`.
- Ruta dedicada de configuracion visual en frontend: `/config`.
- Acceso directo desde sidebar con opcion `Ajustes visuales`.
- Estado backend en tiempo real dentro de `/config` (`backend`, `database`, `minio`, `llm`) consultando `/system/status`.
- Tokens centralizados en `src/styles/tokens.css` con compatibilidad hacia variables legacy.
- Preferencias visuales avanzadas persistentes (`app_ui_preferences`):
  - Fuente (`Inter`, `IBM Plex Sans`, `System`).
  - Escala UI (`Compacto`, `Normal`, `Grande`).
  - Acento por preset o color personalizado.
  - Degradados on/off.
  - Angulo de degradado (0 a 360).
  - Estilo de botón (`Elevado`, `Plano`, `Cristal`).
  - Bordes (`Suave`, `Redondo`).
  - Opacidad UI (slider).
  - Blur de paneles glass (slider).
  - Intensidad de fondo ambiental (slider).
  - Nivel de animación (`Sin animación`, `Suave`, `Completa`).
  - Efecto al cambiar tema (`Sin fade`, `Fade`).
- Tema por defecto forzado a `Claro` cuando no hay configuración guardada.
- Variables CSS dinámicas aplicadas por provider:
  - `--ui-glass-opacity`
  - `--ui-glass-blur`
  - `--ui-bg-intensity`
  - `--accent-gradient`
  - `--shadow-*` por nivel de elevacion

## Archivos clave

- `src/app/providers/ThemeProvider.tsx`
- `src/modules/config/pages/ConfigPage.tsx`
- `src/modules/config/pages/ConfigPage.css`
- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/app/layouts/layouts.css`
- `src/modules/auth/LoginPage.css`

## Cómo agregar un tema nuevo

1. Añadir nombre al tipo `AppTheme` en `ThemeProvider.tsx`.
2. Agregar bloque `:root[data-theme="nuevo"]` en `tokens.css`.
3. Añadir opción en `themeOptions` de `ConfigPage.tsx`.

## Notas

- El sistema conserva variables existentes (`--bg-main`, `--accent-primary`, etc.) para evitar romper componentes actuales.
- El login también consume tokens para que el cambio de tema impacte la pantalla de acceso.
- El fondo de layout y login responde a `backgroundIntensity`.
- El blur de superficies glass responde a `glassBlur`.
