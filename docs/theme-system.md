# Sistema de Tema (Frontend)

## Qué se implementó

- Proveedor real de tema con persistencia en `localStorage` (`app_theme`).
- Atributo `data-theme` aplicado en `document.documentElement`.
- Selector de tema en menú de usuario (`TopBar`): `Claro`, `Oscuro`, `Calma`.
- Tokens centralizados en `src/styles/tokens.css` con compatibilidad hacia variables legacy.

## Archivos clave

- `src/app/providers/ThemeProvider.tsx`
- `src/app/layouts/TopBar.tsx`
- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/app/layouts/layouts.css`

## Cómo agregar un tema nuevo

1. Añadir nombre al tipo `AppTheme` en `ThemeProvider.tsx`.
2. Agregar bloque `:root[data-theme="nuevo"]` en `tokens.css`.
3. Añadir opción en `themeOptions` de `TopBar.tsx`.

## Notas

- El sistema conserva variables existentes (`--bg-main`, `--accent-primary`, etc.) para evitar romper componentes actuales.
- El login también consume tokens para que el cambio de tema impacte la pantalla de acceso.
