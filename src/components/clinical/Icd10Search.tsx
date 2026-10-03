import { useEffect, useState } from "react";
import { Command } from "cmdk";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { Search, Star } from "lucide-react";
import { icd10Endpoints } from "../../services/endpoints";
import type { Icd10Code } from "../../types/clinical";
import "./clinical.css";

function useDebounced<T>(value: T, ms = 180) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

interface Icd10SearchProps {
  onSelect: (code: Icd10Code) => void;
  /** Codes already chosen (shown as added, not selectable). */
  exclude?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  /** "panel": results always visible (inside a sheet). "inline": results drop under the field while typing. */
  variant?: "panel" | "inline";
  label?: string;
  disabled?: boolean;
}

/** CIE-10 command search (cmdk). Code prefix or Spanish text; empty query shows the doctor's frequent codes. */
export default function Icd10Search({ onSelect, exclude = [], placeholder = "Buscar por código o descripción (p. ej. J18, dolor)", autoFocus, variant = "panel", label = "Buscar código CIE-10", disabled }: Icd10SearchProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const q = useDebounced(query.trim());
  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["icd10-search", q],
    queryFn: () => icd10Endpoints.search(q, 20),
    staleTime: 5 * 60 * 1000,
    enabled: !disabled,
  });
  const showList = variant === "panel" || (focused && (query.length > 0 || data.length > 0));

  return (
    <Command label={label} shouldFilter={false} className={clsx("icd-command", `is-${variant}`)} loop
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}>
      <div className="search-field glow-border glow-focus icd-command-field">
        <Search size={18} aria-hidden="true" />
        <Command.Input value={query} onValueChange={setQuery} placeholder={placeholder} autoFocus={autoFocus} disabled={disabled} aria-label={label} />
      </div>
      {showList && (
        <Command.List className="icd-command-list">
          {isFetching && !data.length && <Command.Loading><span className="icd-command-hint">Buscando…</span></Command.Loading>}
          {isError && <div className="icd-command-hint">No se pudo buscar en el catálogo.</div>}
          {!isFetching && !isError && <Command.Empty className="icd-command-hint">Sin resultados para «{query}».</Command.Empty>}
          {!q && data.length > 0 && <div className="icd-command-group-label">Tus códigos frecuentes</div>}
          {data.map((item) => {
            const added = exclude.includes(item.code);
            return (
              <Command.Item key={item.code} value={item.code} disabled={added} className="icd-command-item"
                onSelect={() => { if (!added) { onSelect(item); setQuery(""); } }}>
                <span className="code-pill">{item.code}</span>
                <span className="icd-command-desc">{item.description_es}</span>
                {added ? <span className="icd-command-meta">Agregado</span> : item.is_favorite ? <Star size={14} className="icd-command-star" aria-label="Favorito" /> : null}
              </Command.Item>
            );
          })}
        </Command.List>
      )}
    </Command>
  );
}
