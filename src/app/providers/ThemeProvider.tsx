import { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider: inyecta variables CSS y contexto de tema
 * Por ahora es un pass-through, pero preparado para expansión
 * (toggles light/dark, temas personalizados, etc.)
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
