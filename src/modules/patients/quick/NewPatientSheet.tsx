import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Camera, ChevronDown, UserPlus } from "lucide-react";
import Sheet from "../../../components/common/Sheet";
import Button from "../../../components/common/Button";
import { doctorsEndpoints, patientsEndpoints } from "../../../services/endpoints";
import { useAppStore } from "../../../app/store/useAppStore";
import { usePermission } from "../../../utils/usePermission";
import { openAssistant } from "../../assistant/store";
import type { PatientRecord } from "../../../types/api";
import type { ApiError } from "../../../types/common";
import { ALL_PATIENTS_KEY, findDuplicates, type Duplicates } from "./useQuick";
import { useQuickActions } from "./store";
import "./quick.css";

type Gender = "female" | "male" | "other" | "unknown";
interface Form {
  first_name: string; last_name: string; document_number: string; birth_date: string; gender: Gender | "";
  phone: string; secondary_phone: string; address: string; insurer_name: string; doctor_id: string; notes: string;
}
const EMPTY: Form = { first_name: "", last_name: "", document_number: "", birth_date: "", gender: "", phone: "", secondary_phone: "", address: "", insurer_name: "", doctor_id: "", notes: "" };
type Errors = Partial<Record<keyof Form, string>>;

const today = () => new Date().toISOString().slice(0, 10);

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.first_name.trim()) e.first_name = "Escribe el nombre.";
  if (!f.last_name.trim()) e.last_name = "Escribe los apellidos.";
  if (!f.document_number.trim()) e.document_number = "Escribe el número de documento (cédula o pasaporte).";
  else if (f.document_number.trim().length < 4) e.document_number = "El documento parece incompleto.";
  if (!f.birth_date) e.birth_date = "Indica la fecha de nacimiento.";
  else if (f.birth_date > today()) e.birth_date = "La fecha de nacimiento no puede ser futura.";
  else if (f.birth_date < "1900-01-01") e.birth_date = "Revisa el año de nacimiento.";
  if (!f.gender) e.gender = "Elige el sexo.";
  if (f.phone && !/^[+\d\s()-]{7,}$/.test(f.phone.trim())) e.phone = "Revisa el teléfono (solo números, espacios y +).";
  if (f.secondary_phone && !/^[+\d\s()-]{7,}$/.test(f.secondary_phone.trim())) e.secondary_phone = "Revisa el teléfono (solo números, espacios y +).";
  return e;
}

/** Splits "Ana María Pérez Gómez" into names / surnames for a prefill (2 last words = apellidos). */
function splitName(full = "") {
  const w = full.trim().split(/\s+/).filter(Boolean);
  if (w.length < 2) return { first_name: w[0] ?? "", last_name: "" };
  const cut = w.length >= 4 ? w.length - 2 : w.length - 1;
  return { first_name: w.slice(0, cut).join(" "), last_name: w.slice(cut).join(" ") };
}

/** "Nuevo paciente": one column, labels above, required first; optional data under "Más datos". */
export default function NewPatientSheet({ onCreated }: { onCreated: (p: PatientRecord, after: "profile" | "consultation") => void }) {
  const state = useQuickActions((s) => s.newPatient);
  const close = useQuickActions((s) => s.closeNewPatient);
  const open = !!state;
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const canAi = usePermission("ai:use");
  const canUpload = usePermission("documents:write");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const id = useId();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [more, setMore] = useState(false);
  const [dups, setDups] = useState<Duplicates>({ byDocument: null, byNameBirth: null });
  const [confirmSimilar, setConfirmSimilar] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  const doctors = useQuery({ queryKey: ["doctors", "active"], queryFn: () => doctorsEndpoints.list(1, 100), enabled: open && isAdmin, staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    if (!open) return;
    const initial = { ...EMPTY, ...splitName(state?.name), document_number: state?.document ?? "", doctor_id: user?.doctorId ?? "" };
    setForm(initial);
    setErrors(state?.check ? validate(initial) : {}); setMore(false); setDups({ byDocument: null, byNameBirth: null }); setConfirmSimilar(false);
    if (state?.check) void checkDups(initial);
    requestAnimationFrame(() => firstRef.current?.focus());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    if (k === "document_number") setDups((d) => ({ ...d, byDocument: null }));
    if (k === "first_name" || k === "last_name" || k === "birth_date") { setDups((d) => ({ ...d, byNameBirth: null })); setConfirmSimilar(false); }
  };

  const checkDups = async (f = form) => {
    try { const d = await findDuplicates(qc, f); setDups(d); return d; }
    catch { return { byDocument: null, byNameBirth: null }; } // The server stays the authority; a failed lookup never blocks.
  };

  const save = useMutation({
    mutationFn: () => patientsEndpoints.create({
      first_name: form.first_name.trim(), last_name: form.last_name.trim(), document_number: form.document_number.trim(),
      birth_date: form.birth_date || null, gender: (form.gender || null) as Gender | null,
      phone: form.phone.trim() || null, secondary_phone: form.secondary_phone.trim() || null, address: form.address.trim() || null,
      insurer_name: form.insurer_name.trim() || null, notes: form.notes.trim() || null,
      ...(isAdmin && form.doctor_id ? { doctor_id: form.doctor_id } : {}),
    }),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["patients"] });
      qc.setQueryData<PatientRecord[]>(ALL_PATIENTS_KEY, (list) => (list ? [p, ...list] : list));
      const after = state?.after ?? "profile";
      close();
      onCreated(p, after);
    },
    onError: (e) => {
      const err = e as unknown as ApiError;
      toast.error(err?.code === "CONFLICT" || err?.code === "DUPLICATE" ? "Ya existe un paciente con este documento." : err?.message || "No se pudo crear el paciente. Revisa los datos e inténtalo de nuevo.");
    },
  });

  const submit = async (ev?: FormEvent) => {
    ev?.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) {
      const firstKey = Object.keys(e)[0];
      if (["phone", "secondary_phone"].includes(firstKey)) setMore(true);
      requestAnimationFrame(() => document.getElementById(`${id}-${firstKey}`)?.focus());
      return;
    }
    const d = await checkDups();
    if (d.byDocument) return;
    if (d.byNameBirth && !confirmSimilar) { setConfirmSimilar(true); return; }
    save.mutate();
  };

  const fromPhoto = () => {
    close();
    if (canAi) openAssistant({ prompt: "Crea un paciente nuevo con los datos de esta foto de cédula o documento." });
    else navigate("/documents?intent=identity");
  };

  const field = (k: keyof Form, labelText: string, input: JSX.Element, hint?: string) => (
    <div className="np-field" data-invalid={!!errors[k] || undefined}>
      <label htmlFor={`${id}-${k}`}>{labelText}</label>
      {input}
      {errors[k] ? <p className="np-error" id={`${id}-${k}-err`} role="alert">{errors[k]}</p> : hint ? <p className="np-hint">{hint}</p> : null}
    </div>
  );
  const aria = (k: keyof Form) => ({ id: `${id}-${k}`, "aria-invalid": !!errors[k] || undefined, "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });
  const docDup = dups.byDocument;
  const nameDup = !docDup ? dups.byNameBirth : null;
  const ownDoctor = !isAdmin ? (user?.role === "doctor" ? "Tú" : "El médico al que estás asignada") : null;

  return (
    <Sheet open={open} onClose={close} title="Nuevo paciente"
      subtitle={state?.after === "consultation" ? "Al guardar se abre la consulta de hoy." : "Los campos con * son obligatorios. Lo demás puedes completarlo después."}
      footer={<>
        <Button variant="gray" onClick={close}>Cancelar</Button>
        <Button variant="primary" className="glow-border" type="submit" form={`${id}-form`} isLoading={save.isPending} disabled={!!docDup}>
          <UserPlus size={18} aria-hidden="true" /><span>{nameDup && confirmSimilar ? "Crear de todas formas" : "Guardar paciente"}</span>
        </Button>
      </>}>
      <form id={`${id}-form`} className="np-form" onSubmit={(e) => void submit(e)} noValidate>
        {(canAi || canUpload) && <button type="button" className="np-photo" onClick={fromPhoto}>
          <Camera size={18} aria-hidden="true" />
          <span className="np-photo-copy"><strong>Crear desde foto de cédula o documento</strong><span>{canAi ? "El asistente lee la foto y te propone los datos." : "Se sube el documento y se extraen los datos."}</span></span>
        </button>}

        {field("first_name", "Nombre(s) *", <input {...aria("first_name")} ref={firstRef} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} autoComplete="off" autoCapitalize="words" maxLength={120} />)}
        {field("last_name", "Apellidos *", <input {...aria("last_name")} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} onBlur={() => form.birth_date && void checkDups()} autoComplete="off" autoCapitalize="words" maxLength={120} />)}
        {field("document_number", "Documento (cédula o pasaporte) *", <input {...aria("document_number")} value={form.document_number} onChange={(e) => set("document_number", e.target.value)}
          onBlur={() => form.document_number.trim().length >= 4 && void checkDups()} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={64} />)}
        {docDup && (
          <div className="np-dup is-block" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Ya existe un paciente con este documento: <strong>{docDup.full_name}</strong>. <Link to={`/patients?patientId=${docDup.id}&focus=1`} onClick={close}>Abrir su ficha</Link></p>
          </div>
        )}
        {field("birth_date", "Fecha de nacimiento *", <input {...aria("birth_date")} type="date" max={today()} min="1900-01-01" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} onBlur={() => form.last_name && void checkDups()} />)}
        <fieldset className="np-field np-sex" data-invalid={!!errors.gender || undefined} aria-describedby={errors.gender ? `${id}-gender-err` : undefined}>
          <legend>Sexo *</legend>
          <div className="np-seg" role="radiogroup" aria-label="Sexo">
            {([["female", "Femenino"], ["male", "Masculino"], ["other", "Otro"], ["unknown", "Sin dato"]] as const).map(([v, l], i) => (
              <label key={v} className="np-seg-item">
                <input type="radio" name={`${id}-gender`} id={i === 0 ? `${id}-gender` : undefined} value={v} checked={form.gender === v} onChange={() => set("gender", v)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="np-error" id={`${id}-gender-err`} role="alert">{errors.gender}</p>}
        </fieldset>
        {nameDup && (
          <div className="np-dup" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Ya hay un paciente con el mismo nombre y fecha de nacimiento ({nameDup.document_number}). <Link to={`/patients?patientId=${nameDup.id}&focus=1`} onClick={close}>Abrir su ficha</Link>{confirmSimilar ? " o pulsa «Crear de todas formas» si es otra persona." : "."}</p>
          </div>
        )}

        <button type="button" className="np-more" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore((v) => !v)}>
          <ChevronDown size={18} aria-hidden="true" /><span>Más datos</span><span className="np-more-meta">teléfonos, dirección, aseguradora, médico, notas</span>
        </button>
        {more && (
          <div id={`${id}-more`} className="np-more-body">
            {field("phone", "Teléfono", <input {...aria("phone")} type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />)}
            {field("secondary_phone", "Otro teléfono (familiar o cuidador)", <input {...aria("secondary_phone")} type="tel" inputMode="tel" value={form.secondary_phone} onChange={(e) => set("secondary_phone", e.target.value)} autoComplete="off" />)}
            {field("address", "Dirección", <input {...aria("address")} value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="off" />)}
            {field("insurer_name", "Aseguradora", <input {...aria("insurer_name")} value={form.insurer_name} onChange={(e) => set("insurer_name", e.target.value)} autoComplete="off" />)}
            {isAdmin ? field("doctor_id", "Médico asignado", (
              <select {...aria("doctor_id")} value={form.doctor_id} onChange={(e) => set("doctor_id", e.target.value)}>
                {!user?.doctorId && <option value="">Yo (administración)</option>}
                {(doctors.data?.items ?? []).filter((d) => d.is_active).map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            )) : (
              <div className="np-field"><span className="np-static-label">Médico asignado</span><p className="np-static">{ownDoctor}</p></div>
            )}
            {field("notes", "Notas", <textarea {...aria("notes")} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />)}
          </div>
        )}
      </form>
    </Sheet>
  );
}
