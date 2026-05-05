import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { QueryProvider } from "./QueryProvider";
import { AuthBootstrap } from "./AuthBootstrap";

interface RootProvidersProps {
  children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthBootstrap>{children}</AuthBootstrap>
      </QueryProvider>
    </ThemeProvider>
  );
}
