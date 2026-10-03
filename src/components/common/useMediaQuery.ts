import { useSyncExternalStore } from "react";

/** Matches the CSS breakpoint used across the app for phone layouts. */
export const COMPACT_QUERY = "(max-width: 768px)";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

export const useIsCompact = () => useMediaQuery(COMPACT_QUERY);
