import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Search, UserPlus } from "lucide-react";
import Sheet from "../../../components/common/Sheet";
import { ageFrom } from "../../../utils/labels";
import { norm, normDoc, useAllPatients, useStartConsultation } from "./useQuick";
import { useQuickActions } from "./store";
import "../../../components/clinical/clinical.css";
import "./quick.css";

/** "Nueva consulta" from anywhere: pick a patient (cmdk), the draft is created and the editor opens. */
export default function PatientPicker() {
  const open = useQuickActions((s) => s.picker);
  const close = useQuickActions((s) => s.closePicker);
  const openNewPatient = useQuickActions((s) => s.openNewPatient);
  const [query, setQuery] = useState("");
  const { data = [], isLoading, isError, refetch } = useAllPatients(open);
  const start = useStartConsultation();

  useEffect(() => { if (open) setQuery(""); }, [open]);

  const results = useMemo(() => {
    const q = norm(query);
    const qd = normDoc(query);
    const list = data.filter((p) => p.is_active !== false && p.status !== "deceased");
    if (!q) return list.slice(0, 30);
    return list.filter((p) => norm(p.full_name || `${p.first_name} ${p.last_name}`).includes(q) || (qd.length >= 3 && normDoc(p.document_number).includes(qd))).slice(0, 50);
  }, [data, query]);

  const pick = (id: string) => { start.mutate(id, { onSuccess: () => close() }); };

  return (
    <Sheet open={open} onClose={close} title="Nueva consulta" subtitle="Elige el paciente. Se crea el borrador de hoy y se abre la nota.">
      <Command label="Buscar paciente" shouldFilter={false} className="icd-command is-panel picker-command" loop>
        <div className="search-field glow-border glow-focus icd-command-field">
          <Search size={18} aria-hidden="true" />
          <Command.Input value={query} onValueChange={setQuery} placeholder="Nombre o documento" autoFocus aria-label="Buscar paciente por nombre o documento" disabled={start.isPending} />
        </div>
        <Command.List className="icd-command-list picker-list">
          {isLoading && <Command.Loading><span className="icd-command-hint">Cargando pacientes…</span></Command.Loading>}
          {isError && <div className="icd-command-hint">No se pudo cargar la lista. <button type="button" className="np-link" onClick={() => void refetch()}>Reintentar</button></div>}
          {!isLoading && !isError && results.length === 0 && (
            <div className="icd-command-hint">{query ? `Ningún paciente coincide con «${query}».` : "Aún no hay pacientes."}</div>
          )}
          {!query && results.length > 0 && <div className="icd-command-group-label">Pacientes</div>}
          {results.map((p) => {
            const age = ageFrom(p.birth_date);
            return (
              <Command.Item key={p.id} value={p.id} className="icd-command-item picker-item" onSelect={() => pick(p.id)} disabled={start.isPending}>
                <span className="picker-copy">
                  <span className="picker-name">{p.full_name || `${p.first_name} ${p.last_name}`}</span>
                  <span className="picker-meta">{[p.document_number, age !== null ? `${age} años` : null].filter(Boolean).join(" · ")}</span>
                </span>
                {start.isPending && start.variables === p.id && <span className="icd-command-meta">Abriendo…</span>}
              </Command.Item>
            );
          })}
          <Command.Item value="__new__" className="icd-command-item picker-new" onSelect={() => openNewPatient({ after: "consultation", name: /\d/.test(query) ? undefined : query })} disabled={start.isPending}>
            <UserPlus size={18} aria-hidden="true" />
            <span className="picker-name">{query ? `Nuevo paciente «${query}»` : "Nuevo paciente"}</span>
          </Command.Item>
        </Command.List>
      </Command>
    </Sheet>
  );
}
