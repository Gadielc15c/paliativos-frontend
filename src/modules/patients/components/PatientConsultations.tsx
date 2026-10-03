import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import DataList from "../../../components/common/DataList";
import Pill from "../../../components/common/Pill";
import InlineState from "../../../components/clinical/InlineState";
import { soapEndpoints } from "../../../services/endpoints";
import { usePermission } from "../../../utils/usePermission";
import type { ConsultationRead } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";
import { formatDateTime } from "../../../utils/format";

const STATUS: Record<ConsultationRead["status"], { label: string; tone: "warning" | "success" | "info" }> = {
  draft: { label: "Borrador", tone: "warning" }, signed: { label: "Firmada", tone: "success" }, amended: { label: "Con enmiendas", tone: "info" },
};

/** Consultations of a patient (GET /consultations/patient/{id}); opens the SOAP editor. */
export default function PatientConsultations({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const canWrite = usePermission("clinical:write");
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["patient-consultations", patientId], queryFn: () => soapEndpoints.listByPatient(patientId) });
  const create = useMutation({
    mutationFn: () => soapEndpoints.create({ patient_id: patientId, consultation_date: new Date().toISOString() }),
    onSuccess: (c) => navigate(`/consultations/${c.id}`),
    onError: (e) => toast.error((e as unknown as ApiError)?.message || "No se pudo crear la consulta."),
  });
  const open = (c: ConsultationRead) => navigate(`/consultations/${c.id}`);

  return (
    <section className="patient-profile-section">
      <div className="patient-profile-section-head">
        <h3>Consultas</h3>
        {canWrite && (
          <button className="patient-profile-add-btn" onClick={() => create.mutate()} disabled={create.isPending} type="button">
            <Plus size={18} />{create.isPending ? "Creando…" : "Nueva consulta"}
          </button>
        )}
      </div>
      {isLoading ? <div className="card-skeleton">{[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 64 }} />)}</div>
        : isError ? <InlineState kind="error" message="No se pudieron cargar las consultas." onRetry={() => void refetch()} />
        : !data.length ? <InlineState message="Sin consultas registradas." />
        : (
          <DataList<ConsultationRead>
            label="Consultas del paciente"
            layout="cards"
            rows={data}
            rowKey={(c) => c.id}
            onRowClick={open}
            columns={[]}
            title={(c) => c.chief_complaint || c.reason || "Consulta sin motivo"}
            subtitle={(c) => [c.assessment, c.plan && `Plan: ${c.plan}`].filter(Boolean).join(" · ") || (c.status === "draft" ? "Borrador sin completar" : "—")}
            detail={(c) => formatDateTime(c.consultation_date)}
            status={(c) => <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>}
          />
        )}
    </section>
  );
}
