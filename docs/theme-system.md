# Sistema de Tema (Frontend)

## Qué se implementó

- Proveedor real de tema con persistencia en `localStorage` (`app_theme`).
- Atributo `data-theme` aplicado en `document.documentElement`.
- Selector de tema en engrane de configuración del `Sidebar`: `Claro`, `Oscuro`, `Calma`.
- En el mismo engrane se muestra estado backend en tiempo real (`backend`, `database`, `minio`, `llm`) consultando `/system/status`.
- Tokens centralizados en `src/styles/tokens.css` con compatibilidad hacia variables legacy.
- Preferencias visuales avanzadas persistentes (`app_ui_preferences`):
  - Fuente (`Inter`, `IBM Plex Sans`, `System`).
  - Escala UI (`Compacto`, `Normal`, `Grande`).
  - Acento por preset o color personalizado.
  - Degradados on/off.
  - Estilo de botón (`Elevado`, `Plano`, `Cristal`).
  - Bordes (`Suave`, `Redondo`).
  - Opacidad UI (slider).
  - Nivel de animación (`Sin animación`, `Suave`, `Completa`).
  - Efecto al cambiar tema (`Sin fade`, `Fade`).
- Tema por defecto forzado a `Claro` cuando no hay configuración guardada.

## Archivos clave

- `src/app/providers/ThemeProvider.tsx`
- `src/app/layouts/TopBar.tsx`
- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/app/layouts/layouts.css`

## Cómo agregar un tema nuevo

1. Añadir nombre al tipo `AppTheme` en `ThemeProvider.tsx`.
2. Agregar bloque `:root[data-theme="nuevo"]` en `tokens.css`.
3. Añadir opción en `themeOptions` de `Sidebar.tsx`.

## Notas

- El sistema conserva variables existentes (`--bg-main`, `--accent-primary`, etc.) para evitar romper componentes actuales.
- El login también consume tokens para que el cambio de tema impacte la pantalla de acceso.
