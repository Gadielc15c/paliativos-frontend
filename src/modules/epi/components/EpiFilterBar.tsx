import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search, X } from "lucide-react";
import ActionMenu from "../../../components/common/ActionMenu";
import Pill from "../../../components/common/Pill";
import Sheet from "../../../components/common/Sheet";
import Button from "../../../components/common/Button";
import Icd10Search from "../../../components/clinical/Icd10Search";
import { doctorsEndpoints } from "../../../services/endpoints";
import { useAppStore } from "../../../app/store/useAppStore";
import { AGE_OPTIONS, CHAPTER_OPTIONS, PERIODS, SEX_OPTIONS, type PeriodKey, type useEpiFilters } from "./useEpiFilters";

type Ctl = ReturnType<typeof useEpiFilters>;
const blank = <span className="filter-check-blank" />;

function FilterMenu({ label, value, options, onChange }: { label: string; value: string | null; options: Array<{ value: string; label: string }>; onChange: (v: string | null) => void }) {
  const current = options.find((o) => o.value === value);
  return (
    <ActionMenu
      className={current ? "filter-pill is-active" : "filter-pill"}
      icon={<ChevronDown size={16} aria-hidden="true" />}
      text={current ? `${label}: ${current.label}` : label}
      label={label}
      actions={[
        { id: "__all", label: "Todos", icon: value ? blank : <Check size={16} />, onClick: () => onChange(null) },
        ...options.map((o) => ({ id: o.value, label: o.label, icon: o.value === value ? <Check size={16} /> : blank, onClick: () => onChange(o.value) })),
      ]}
    />
  );
}

/** Period pills + dimension filters. Every value lives in the URL. */
export default function EpiFilterBar({ ctl }: { ctl: Ctl }) {
  const { params, period, set, activeCount } = ctl;
  const isAdmin = useAppStore((s) => s.user?.role === "admin");
  const [customOpen, setCustomOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [range, setRange] = useState({ from: params.get("from") || "", to: params.get("to") || "" });
  const { data: doctors } = useQuery({ queryKey: ["doctors-epi"], queryFn: () => doctorsEndpoints.list(1, 100), enabled: isAdmin, staleTime: 10 * 60 * 1000 });

  const choosePeriod = (p: PeriodKey) => {
    if (p === "custom") { setCustomOpen(true); return; }
    set({ period: p, from: null, to: null });
  };

  return (
    <>
      <div className="epi-filter-row" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <Pill key={p.value} selected={period === p.value} onClick={() => choosePeriod(p.value)}>
            {p.value === "custom" && period === "custom" && params.get("from") ? `${params.get("from")} → ${params.get("to") || "hoy"}` : p.label}
          </Pill>
        ))}
      </div>
      <span className="epi-filter-divider" aria-hidden="true" />
      <div className="epi-filter-row" role="group" aria-label="Filtros">
        {isAdmin && (
          <FilterMenu label="Médico" value={params.get("doctor")} onChange={(v) => set({ doctor: v })}
            options={(doctors?.items ?? []).map((d) => ({ value: d.id, label: d.full_name }))} />
        )}
        <FilterMenu label="Sexo" value={params.get("sex")} options={SEX_OPTIONS} onChange={(v) => set({ sex: v })} />
        <FilterMenu label="Edad" value={params.get("age")} options={AGE_OPTIONS} onChange={(v) => set({ age: v })} />
        {params.get("cat") ? (
          <Pill tone="info" removable onRemove={() => set({ cat: null, catl: null, chapter: null })} removeLabel="Quitar categoría">{`Categoría: ${params.get("catl") || params.get("chapter") || params.get("cat")}`}</Pill>
        ) : (
          <FilterMenu label="Capítulo" value={params.get("chapter")} options={CHAPTER_OPTIONS} onChange={(v) => set({ chapter: v })} />
        )}
        {params.get("code") ? (
          <Pill tone="info" removable onRemove={() => set({ code: null })} removeLabel={`Quitar filtro ${params.get("code")}`}>{`CIE-10: ${params.get("code")}`}</Pill>
        ) : (
          <button type="button" className="action-menu-trigger has-text filter-pill is-search" onClick={() => setCodeOpen(true)}>
            <Search size={16} aria-hidden="true" /><span>CIE-10</span>
          </button>
        )}
        {activeCount > 0 && (
          <button type="button" className="filter-clear" onClick={() => set({ doctor: null, sex: null, age: null, chapter: null, code: null, cat: null, catl: null })}>
            <X size={16} aria-hidden="true" />Limpiar
          </button>
        )}
      </div>

      <Sheet open={codeOpen} onClose={() => setCodeOpen(false)} title="Filtrar por código CIE-10"
        subtitle="Elige un código o categoría. El filtro usa el prefijo: C34 incluye C34.0–C34.9.">
        <Icd10Search autoFocus onSelect={(c) => { set({ code: c.code }); setCodeOpen(false); }} />
      </Sheet>

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Período personalizado"
        footer={<>
          <Button variant="gray" onClick={() => setCustomOpen(false)}>Cancelar</Button>
          <Button variant="primary" disabled={!range.from} onClick={() => { set({ period: "custom", from: range.from, to: range.to || null }); setCustomOpen(false); }}>Aplicar</Button>
        </>}>
        <div className="form-grid">
          <label>Desde<input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
          <label>Hasta<input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
        </div>
      </Sheet>
    </>
  );
}
