import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Sheet from "../../../components/common/Sheet";
import DataList from "../../../components/common/DataList";
import Pill from "../../../components/common/Pill";
import InlineState from "../../../components/clinical/InlineState";
import { epiEndpoints } from "../../../services/endpoints";
import { usePermission } from "../../../utils/usePermission";
import type { EpiFilters, EpiPatientRow } from "../../../types/clinical";
import { dateLabel, fmt } from "./format";

const SEX: Record<string, string> = { female: "F", male: "M", other: "Otro", unknown: "—" };

export default function DrilldownSheet({ code, description, filters, onClose }: { code: string | null; description?: string; filters: EpiFilters; onClose: () => void }) {
  const navigate = useNavigate();
  const canSeePatients = usePermission("epi:read", "patients:read");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["epi-drill", code, filters],
    queryFn: () => epiEndpoints.patientsByDiagnosis(filters, code!, 1, 50),
    enabled: !!code && canSeePatients,
  });
  const open = (row: EpiPatientRow) => navigate(`/patients?patientId=${row.patient_id}&focus=1`);

  return (
    <Sheet open={!!code} onClose={onClose} size="lg"
      title={<><span className="code-pill sheet-code">{code}</span> {description ?? "Pacientes"}</>}
      subtitle={data ? `${fmt(data.total)} pacientes con este diagnóstico en el período` : "Pacientes con este diagnóstico en el período"}>
      {!canSeePatients ? (
        <InlineState message="Tu rol no puede ver la lista de pacientes de este diagnóstico." />
      ) : isLoading ? (
        <div className="drill-skeleton">{[0, 1, 2, 3].map((i) => <span key={i} className="skeleton" style={{ height: 64 }} />)}</div>
      ) : isError ? (
        <InlineState kind="error" message="No se pudo cargar la lista de pacientes." onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <InlineState message="Ningún paciente coincide con estos filtros." />
      ) : (
        <DataList<EpiPatientRow>
          label={`Pacientes con ${code}`}
          layout="cards"
          rows={data.items}
          rowKey={(r) => r.patient_id}
          onRowClick={open}
          columns={[]}
          title={(r) => r.full_name}
          subtitle={(r) => `${r.age ?? "—"} años · ${SEX[r.sex] ?? r.sex} · ${r.doctor_name}`}
          detail={(r) => `Último: ${dateLabel(r.last_date)} · ${r.diagnoses} ${r.diagnoses === 1 ? "registro" : "registros"}`}
          status={(r) => <span className="drill-codes">{r.codes.slice(0, 2).map((c) => <Pill key={c} tone="info">{c}</Pill>)}</span>}
        />
      )}
    </Sheet>
  );
}
