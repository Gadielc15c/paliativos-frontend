import { create } from "zustand";

/** What happens after "Nuevo paciente" saves: open the ficha (default) or go straight to a new consultation. */
export type AfterCreate = "profile" | "consultation";

interface QuickState {
  newPatient: { after: AfterCreate; name?: string; document?: string; check?: boolean } | null;
  picker: boolean;
  openNewPatient: (opts?: { after?: AfterCreate; name?: string; document?: string; check?: boolean }) => void;
  closeNewPatient: () => void;
  openNewConsultation: () => void;
  closePicker: () => void;
}

/** Global "Nuevo paciente" / "Nueva consulta" flows, opened from Inicio, Pacientes, the top bar and "Más". */
export const useQuickActions = create<QuickState>((set) => ({
  newPatient: null,
  picker: false,
  openNewPatient: (opts = {}) => set({ newPatient: { after: opts.after ?? "profile", name: opts.name, document: opts.document, check: opts.check }, picker: false }),
  closeNewPatient: () => set({ newPatient: null }),
  openNewConsultation: () => set({ picker: true, newPatient: null }),
  closePicker: () => set({ picker: false }),
}));

export const openNewPatient = (opts?: { after?: AfterCreate; name?: string; document?: string; check?: boolean }) => useQuickActions.getState().openNewPatient(opts);
export const openNewConsultation = () => useQuickActions.getState().openNewConsultation();
