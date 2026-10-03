import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePermission } from "../../../utils/usePermission";
import type { PatientRecord } from "../../../types/api";
import NewPatientSheet from "./NewPatientSheet";
import PatientPicker from "./PatientPicker";
import { useQuickActions } from "./store";
import { useStartConsultation } from "./useQuick";

/**
 * Mounted once in AppLayout. Hosts the "Nuevo paciente" sheet and the "Nueva consulta" picker so any screen
 * (Inicio, Pacientes, top bar, "Más") can open them. `?quick=new-patient|new-consultation` opens them by link.
 */
export default function QuickActionsHost() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canCreatePatient = usePermission("patients:write");
  const canConsult = usePermission("clinical:write");
  const start = useStartConsultation();
  const { openNewPatient, openNewConsultation } = useQuickActions();

  // Deep links (also used by ui-verify): open once, then drop the param.
  useEffect(() => {
    const q = params.get("quick");
    if (!q) return;
    // DEV preview: &np=check prefills an existing document and validates (shows errors + the duplicate warning).
    const check = import.meta.env.DEV && params.get("np") === "check";
    if (q === "new-patient" && canCreatePatient) openNewPatient({ name: params.get("name") ?? (check ? "Elena Rodríguez" : undefined), document: check ? "CI-8024500" : undefined, check });
    if (q === "new-consultation" && canConsult) openNewConsultation();
    const n = new URLSearchParams(params); n.delete("quick"); n.delete("name"); n.delete("np");
    setParams(n, { replace: true });
  }, [params.get("quick")]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCreated = (p: PatientRecord, after: "profile" | "consultation") => {
    if (after === "consultation" && canConsult) {
      toast.success("Paciente creado", { description: `${p.full_name}. Abriendo la consulta de hoy…` });
      start.mutate(p.id);
      return;
    }
    navigate(`/patients?patientId=${p.id}&focus=1`);
    toast.success("Paciente creado", {
      description: `${p.full_name} ya está en tu lista.`,
      ...(canConsult ? { action: { label: "Iniciar consulta", onClick: () => start.mutate(p.id) }, duration: 8000 } : {}),
    });
  };

  return (
    <>
      {canCreatePatient && <NewPatientSheet onCreated={onCreated} />}
      {canConsult && <PatientPicker />}
    </>
  );
}
