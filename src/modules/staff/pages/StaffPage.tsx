import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Copy, KeyRound, Search, ShieldCheck, UserCheck, UserPlus, UserX, Wand2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import Pill from "../../../components/common/Pill";
import Sheet from "../../../components/common/Sheet";
import SegmentedControl from "../../../components/common/SegmentedControl";
import InlineState from "../../../components/clinical/InlineState";
import { useDashboardAlerts } from "../../../components/clinical/alerts";
import { staffEndpoints, type StaffCreate } from "../../../services/endpoints/staff";
import type { StaffRead } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";
import { label } from "../../../utils/labels";
import { formatDate } from "../../../utils/format";
import "../../../components/clinical/clinical.css";
import "./StaffPage.css";

type RoleFilter = "all" | "doctor" | "secretary" | "admin";
const ROLE_FILTERS: RoleFilter[] = ["all", "doctor", "secretary", "admin"];
const EMPTY: StaffCreate = { type: "doctor", first_name: "", last_name: "", email: "", temporary_password: "", phone: "", specialty: "", license_number: "", doctor_id: null };

/** 12 chars, no look-alike characters (0/O, 1/l/I), always with upper, lower and a digit. */
function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789"];
  const all = sets.join("");
  const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const chars = [...sets.map((s) => s[rnd(s.length)]), ...Array.from({ length: 9 }, () => all[rnd(all.length)])];
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

const roleOf = (s: StaffRead) => (s.role === "admin" ? "admin" : s.type);
const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); toast.success(`${what} copiado`); };

/** Equipo (admin): doctors and secretaries with their login, in one list. */
export default function StaffPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const roleParam = params.get("role") as RoleFilter | null;
  const role: RoleFilter = roleParam && ROLE_FILTERS.includes(roleParam) ? roleParam : "all";
  const staffId = params.get("staffId");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<StaffCreate>(EMPTY);
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string; created: boolean } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["staff"], queryFn: () => staffEndpoints.list() });
  const { data: alerts } = useDashboardAlerts();
  const all = data?.items ?? [];
  const doctors = all.filter((s) => s.type === "doctor" && s.is_active);
  const rows = all.filter((s) => (role === "all" || roleOf(s) === role || (role === "doctor" && s.type === "doctor"))
    && (!q || `${s.full_name} ${s.email}`.toLowerCase().includes(q.toLowerCase())));
  const doctorName = (id: string | null) => all.find((s) => s.type === "doctor" && s.doctor_id === id)?.full_name ?? "un médico sin asignar";
  const selected = all.find((s) => s.id === staffId) ?? null;

  /** Inactive doctors that still have active patients (from the inactive_staff alert). */
  const orphaned = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of alerts?.items ?? []) {
      if (a.type !== "inactive_staff") continue;
      const id = a.action.route.match(/staffId=([^&]+)/)?.[1];
      const profile = a.id.split(":")[1];
      const s = all.find((x) => x.id === id || x.doctor_id === profile);
      if (s) m.set(s.id, a.count);
    }
    return m;
  }, [alerts, all]);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };
  useEffect(() => { if (staffId && selected) document.getElementById(`staff-${staffId}`)?.scrollIntoView({ block: "center" }); }, [staffId, selected]);

  const err = (e: unknown) => toast.error((e as unknown as ApiError)?.message || "No se pudo completar la acción.");
  const create = useMutation({
    mutationFn: () => staffEndpoints.create({
      ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(),
      phone: form.phone?.trim() || null,
      specialty: form.type === "doctor" ? form.specialty?.trim() || null : null,
      license_number: form.type === "doctor" ? form.license_number?.trim() || null : null,
      doctor_id: form.type === "secretary" ? form.doctor_id : null,
    }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
      setCreateOpen(false);
      setCredentials({ name: s.full_name, email: s.email, password: form.temporary_password, created: true });
      setForm(EMPTY);
    },
    onError: err,
  });
  const update = useMutation({
    mutationFn: ({ s, patch }: { s: StaffRead; patch: Partial<StaffRead> }) => staffEndpoints.update(s.id, patch),
    onSuccess: (s, { patch }) => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
      if ("is_active" in patch) toast.success(s.is_active ? `${s.full_name} reactivado: ya puede entrar` : `${s.full_name} desactivado: ya no puede entrar`);
      else toast.success("Cambios guardados");
    },
    onError: err,
  });
  const reset = useMutation({
    mutationFn: (s: StaffRead) => staffEndpoints.resetPassword(s.id).then((r) => ({ r, s })),
    onSuccess: ({ r, s }) => { if (r.temporary_password) setCredentials({ name: s.full_name, email: s.email, password: r.temporary_password, created: false }); else toast.success("Contraseña restablecida"); },
    onError: err,
  });

  const set = (patch: Partial<StaffCreate>) => setForm((f) => ({ ...f, ...patch }));
  const missing = [
    !form.first_name.trim() && "nombre", !form.last_name.trim() && "apellidos", !/\S+@\S+\.\S+/.test(form.email) && "email válido",
    form.temporary_password.length < 8 && "contraseña de 8 caracteres o más",
    form.type === "doctor" && !form.specialty?.trim() && "especialidad", form.type === "doctor" && !form.license_number?.trim() && "exequátur",
    form.type === "secretary" && !form.doctor_id && "médico al que asiste",
  ].filter(Boolean) as string[];

  const roleFor = (s: StaffRead) => <Pill tone={roleOf(s) === "admin" ? "warning" : s.type === "doctor" ? "info" : "neutral"}>{label("role", roleOf(s))}</Pill>;
  const statusFor = (s: StaffRead) => (
    <span className="staff-status">
      {orphaned.has(s.id) && <Pill tone="danger">{`Reasignar ${orphaned.get(s.id)} pacientes`}</Pill>}
      <Pill tone={s.is_active ? "success" : "neutral"}>{label("activeFlag", s.is_active)}</Pill>
    </span>
  );
  const what = (s: StaffRead) => (s.type === "doctor" ? [s.specialty, s.license_number && `Exequátur ${s.license_number}`].filter(Boolean).join(" · ") || "Médico" : `Asiste a ${doctorName(s.doctor_id)}`);
  const openCreate = (type: StaffCreate["type"] = role === "secretary" ? "secretary" : "doctor") => { setForm({ ...EMPTY, type }); setCreateOpen(true); };

  return (
    <div className="data-screen staff-page">
      <PageHeader
        back={{ label: "Administración", onClick: () => navigate("/admin") }}
        title="Equipo"
        description="Médicos y secretarias que usan la plataforma. Al agregar a alguien se crea también su usuario para entrar."
        actions={<Button variant="primary" className="glow-border" onClick={() => openCreate()}><UserPlus size={18} aria-hidden="true" /><span>Agregar profesional</span></Button>}
        filters={<>
          <SegmentedControl label="Filtrar por rol" value={role} onChange={(v) => setParam({ role: v === "all" ? null : v })} className="staff-segmented"
            segments={[
              { value: "all", label: "Todos", badge: all.length },
              { value: "doctor", label: "Médicos", badge: all.filter((s) => s.type === "doctor").length },
              { value: "secretary", label: "Secretarias", badge: all.filter((s) => s.type === "secretary").length },
              { value: "admin", label: "Admin", badge: all.filter((s) => s.role === "admin").length },
            ]} />
          <label className="search-field glow-border glow-focus staff-search">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email" aria-label="Buscar en el equipo" enterKeyHint="search" />
          </label>
        </>}
      />

      {orphaned.size > 0 && (
        <p className="staff-banner" role="status"><AlertTriangle size={18} aria-hidden="true" />
          Hay médicos desactivados con pacientes activos. Abre su ficha y reasigna sus pacientes o reactívalos.</p>
      )}

      <section className="data-card">
        <div className="data-card-body">
          {isLoading ? <div className="card-skeleton">{[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 56 }} />)}</div>
            : isError ? <InlineState kind="error" message="No se pudo cargar el equipo." onRetry={() => void refetch()} />
            : rows.length === 0 ? (
              all.length ? (
                <InlineState message={q ? `Nadie coincide con «${q}». Prueba con otro nombre o email.` : `Todavía no hay ${role === "secretary" ? "secretarias" : role === "admin" ? "administradores" : "médicos"} en el equipo.`}>
                  {!q && role !== "admin" && <Button variant="gray" onClick={() => openCreate(role === "secretary" ? "secretary" : "doctor")}><UserPlus size={18} aria-hidden="true" /><span>{role === "secretary" ? "Agregar secretaria" : "Agregar médico"}</span></Button>}
                </InlineState>
              ) : (
                <InlineState message="Aún no hay nadie en el equipo. Agrega al primer médico con «Agregar profesional»; después podrás sumar a sus secretarias.">
                  <Button variant="gray" onClick={() => openCreate("doctor")}><UserPlus size={18} aria-hidden="true" /><span>Agregar profesional</span></Button>
                </InlineState>
              )
            ) : (
              <DataList<StaffRead>
                label="Miembros del equipo"
                rows={rows}
                rowKey={(s) => s.id}
                selectedKey={staffId}
                columns={[
                  { key: "name", header: "Nombre", cell: (s) => <span id={`staff-${s.id}`} className="staff-name"><strong>{s.full_name}</strong><span className="cell-code">{s.email}</span></span> },
                  { key: "role", header: "Rol", cell: roleFor },
                  { key: "detail", header: "Qué hace", cell: what },
                  { key: "status", header: "Estado", cell: statusFor },
                ]}
                title={(s) => <span id={`staff-${s.id}`}>{s.full_name}</span>}
                subtitle={(s) => `${label("role", roleOf(s))} · ${what(s)}`}
                detail={(s) => (
                  <>
                    <span className="cell-code">{s.email}</span>
                    {orphaned.has(s.id) && <span className="staff-flag-line"><Pill tone="danger">{`Reasignar ${orphaned.get(s.id)} pacientes`}</Pill></span>}
                  </>
                )}
                status={(s) => <Pill tone={s.is_active ? "success" : "neutral"}>{label("activeFlag", s.is_active)}</Pill>}
                actions={(s) => [
                  { label: "Ver ficha", onClick: () => setParam({ staffId: s.id }) },
                  { label: "Restablecer contraseña", icon: <KeyRound size={16} />, onClick: () => reset.mutate(s), disabled: reset.isPending },
                  s.is_active
                    ? { label: "Desactivar acceso", icon: <UserX size={16} />, destructive: true, onClick: () => update.mutate({ s, patch: { is_active: false } }), disabled: update.isPending }
                    : { label: "Reactivar acceso", icon: <UserCheck size={16} />, onClick: () => update.mutate({ s, patch: { is_active: true } }), disabled: update.isPending },
                ]}
              />
            )}
        </div>
      </section>

      {/* Member detail: everything about one person and what can be changed. */}
      <Sheet open={!!selected} onClose={() => setParam({ staffId: null })} title={selected?.full_name ?? ""}
        subtitle={selected ? `${label("role", roleOf(selected))} · ${label("activeFlag", selected.is_active)}` : undefined}
        footer={selected && <>
          <Button variant="gray" onClick={() => reset.mutate(selected)} isLoading={reset.isPending}><KeyRound size={18} aria-hidden="true" /><span>Restablecer contraseña</span></Button>
          {selected.is_active
            ? <Button variant="destructive" onClick={() => update.mutate({ s: selected, patch: { is_active: false } })} isLoading={update.isPending}><UserX size={18} aria-hidden="true" /><span>Desactivar acceso</span></Button>
            : <Button variant="primary" onClick={() => update.mutate({ s: selected, patch: { is_active: true } })} isLoading={update.isPending}><UserCheck size={18} aria-hidden="true" /><span>Reactivar acceso</span></Button>}
        </>}>
        {selected && (
          <>
            {orphaned.has(selected.id) && (
              <p className="staff-banner" role="alert"><AlertTriangle size={18} aria-hidden="true" />
                {`${orphaned.get(selected.id)} pacientes activos siguen asignados a este médico desactivado. Reactívalo o reasígnalos desde Pacientes.`}</p>
            )}
            <dl className="kv-list">
              <div className="kv-row"><dt>Email (usuario)</dt><dd>{selected.email}</dd></div>
              <div className="kv-row"><dt>Teléfono</dt><dd>{selected.phone || "Sin registrar"}</dd></div>
              {selected.type === "doctor" ? (
                <>
                  <div className="kv-row"><dt>Especialidad</dt><dd>{selected.specialty || "Sin registrar"}</dd></div>
                  <div className="kv-row"><dt>Exequátur</dt><dd>{selected.license_number || "Sin registrar"}</dd></div>
                </>
              ) : (
                <div className="kv-row"><dt>Asiste a</dt><dd>{doctorName(selected.doctor_id)}</dd></div>
              )}
              <div className="kv-row"><dt>En el equipo desde</dt><dd>{formatDate(selected.created_at)}</dd></div>
            </dl>
            {selected.type === "secretary" && (
              <label className="staff-field">Cambiar médico asignado
                <select value={selected.doctor_id ?? ""} disabled={update.isPending}
                  onChange={(e) => e.target.value && update.mutate({ s: selected, patch: { doctor_id: e.target.value } })}>
                  {!selected.doctor_id && <option value="">Elegir médico…</option>}
                  {doctors.map((d) => <option key={d.id} value={d.doctor_id ?? ""}>{d.full_name}</option>)}
                </select>
              </label>
            )}
            <p className="staff-hint"><ShieldCheck size={16} aria-hidden="true" />
              {selected.type === "secretary" ? "Las secretarias ven pacientes, agenda y cobros de su médico. No ven notas clínicas ni epidemiología." : "Los médicos ven y firman las notas de sus pacientes."}</p>
          </>
        )}
      </Sheet>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Agregar profesional"
        subtitle="Se crea su ficha y su usuario. Podrá entrar en cuanto termines."
        footer={<>
          <Button variant="gray" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => create.mutate()} disabled={missing.length > 0} isLoading={create.isPending}
            title={missing.length ? `Falta: ${missing.join(", ")}` : undefined}>Crear y dar acceso</Button>
        </>}>
        <SegmentedControl label="¿Qué rol tendrá?" value={form.type} onChange={(v) => set({ type: v })}
          segments={[{ value: "doctor", label: "Médico" }, { value: "secretary", label: "Secretaria" }]} />
        <p className="staff-hint"><ShieldCheck size={16} aria-hidden="true" />
          {form.type === "doctor" ? "Un médico atiende pacientes, escribe y firma notas, y ve su epidemiología." : "Una secretaria trabaja para un médico: ve sus pacientes, agenda y cobros, pero no las notas clínicas."}</p>
        <div className="form-grid">
          <label>Nombre<input value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} autoComplete="off" /></label>
          <label>Apellidos<input value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} autoComplete="off" /></label>
          {form.type === "doctor" ? (
            <>
              <label>Especialidad<input value={form.specialty ?? ""} onChange={(e) => set({ specialty: e.target.value })} placeholder="Ej.: Medicina paliativa" /></label>
              <label>Exequátur / licencia<input value={form.license_number ?? ""} onChange={(e) => set({ license_number: e.target.value })} autoCapitalize="characters" /></label>
            </>
          ) : (
            <label>Médico al que asiste
              <select value={form.doctor_id ?? ""} onChange={(e) => set({ doctor_id: e.target.value || null })}>
                <option value="">Elegir médico…</option>
                {doctors.map((d) => <option key={d.id} value={d.doctor_id ?? ""}>{d.full_name}</option>)}
              </select>
            </label>
          )}
          <label>Email (será su usuario)<input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoCapitalize="none" autoCorrect="off" autoComplete="off" inputMode="email" /></label>
          <label>Teléfono (opcional)<input type="tel" value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></label>
          <label className="staff-password-field">Contraseña temporal
            <span className="staff-password-row">
              <input type="text" value={form.temporary_password} minLength={8} onChange={(e) => set({ temporary_password: e.target.value })} autoComplete="new-password" autoCapitalize="none" placeholder="Mínimo 8 caracteres" />
              <Button variant="gray" type="button" onClick={() => set({ temporary_password: generatePassword() })}><Wand2 size={16} aria-hidden="true" /><span>Generar</span></Button>
            </span>
          </label>
        </div>
        {missing.length > 0 && <p className="staff-missing">Para continuar falta: {missing.join(", ")}.</p>}
      </Sheet>

      <Sheet open={!!credentials} onClose={() => setCredentials(null)}
        title={credentials?.created ? "Ya puede entrar" : "Contraseña restablecida"}
        subtitle={credentials ? `${credentials.name} entra con estos datos. La contraseña solo se muestra ahora.` : undefined}
        footer={<Button variant="primary" onClick={() => setCredentials(null)}>Listo</Button>}>
        {credentials && (
          <div className="staff-credentials">
            <div className="staff-cred-row">
              <span className="staff-cred-label">Usuario (email)</span>
              <code>{credentials.email}</code>
              <Button variant="gray" onClick={() => copy(credentials.email, "Usuario")}><Copy size={16} aria-hidden="true" /><span>Copiar</span></Button>
            </div>
            <div className="staff-cred-row">
              <span className="staff-cred-label">Contraseña temporal</span>
              <code className="staff-cred-password">{credentials.password}</code>
              <Button variant="gray" onClick={() => copy(credentials.password, "Contraseña")}><Copy size={16} aria-hidden="true" /><span>Copiar</span></Button>
            </div>
            <p className="staff-hint"><ShieldCheck size={16} aria-hidden="true" />Compártela en persona o por un canal seguro (no por un grupo). Pídele que la cambie al entrar por primera vez.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
