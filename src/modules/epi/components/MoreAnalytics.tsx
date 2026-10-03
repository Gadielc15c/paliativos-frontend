import { useQuery } from "@tanstack/react-query";
import InlineState from "../../../components/clinical/InlineState";
import DataList from "../../../components/common/DataList";
import { dashboardEndpoints, epiEndpoints } from "../../../services/endpoints";
import type { EpiBreakdownItem } from "../../../types/clinical";
import Change from "./Change";
import { fmt } from "./format";
import type { EpiQueryFilters } from "./useEpiFilters";

const dec = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? "—" : n.toLocaleString("es-DO", { maximumFractionDigits: digits }));

/**
 * Patient flow from /dashboard/kpis (same period + doctor): new enrolments vs patients seen.
 * Honest labels: "nuevos" = registered in the period (the API has no first-visit split by diagnosis).
 */
export function PatientFlowCard({ filters }: { filters: EpiQueryFilters }) {
  const params = { date_from: filters.date_from, date_to: filters.date_to, doctor_id: filters.doctor_id };
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["epi-flow", params], queryFn: () => dashboardEndpoints.kpis(params), staleTime: 5 * 60 * 1000, retry: 1 });
  const seen = data?.patients_seen ?? 0;
  const fresh = data?.new_patients.value ?? 0;
  const freshShare = seen ? Math.min(100, Math.round((fresh / seen) * 100)) : 0;

  return (
    <section className="data-card epi-flow" aria-labelledby="epi-flow-title">
      <div className="data-card-header">
        <div>
          <h2 id="epi-flow-title" className="data-card-title">Pacientes nuevos y en seguimiento</h2>
          <p className="data-card-subtitle">Solo aplica el período y el médico</p>
        </div>
      </div>
      <div className="data-card-body epi-flow-body">
        {isLoading ? <div className="card-skeleton">{[0, 1, 2].map((k) => <span key={k} className="skeleton" style={{ height: 44 }} />)}</div>
          : isError || !data ? <InlineState kind="error" message="No se pudieron cargar los pacientes del período." onRetry={() => void refetch()} />
          : seen === 0 && fresh === 0 ? <InlineState message="Sin pacientes atendidos en este período. Prueba con un período más amplio." />
          : (
            <>
              <div className="flow-meter" role="img" aria-label={`${fresh} pacientes nuevos frente a ${seen} pacientes atendidos`}>
                <span className="flow-meter-fill" style={{ width: `${freshShare}%` }} />
              </div>
              <dl className="flow-stats">
                <div><dt>Pacientes atendidos</dt><dd>{fmt(seen)}</dd></div>
                <div><dt>Nuevos (registrados en el período)</dt><dd>{fmt(fresh)} <Change current={fresh} previous={data.new_patients.previous} pct={data.new_patients.delta_pct} withValue={false} unit={["paciente", "pacientes"]} /></dd></div>
                <div><dt>Consultas por paciente</dt><dd>{dec(data.avg_consultations_per_patient)}</dd></div>
                <div><dt>Días entre consultas (mediana)</dt><dd>{dec(data.median_days_between_consultations)}</dd></div>
              </dl>
            </>
          )}
      </div>
    </section>
  );
}

/** Admin: one row per doctor (breakdown by=doctor), consultations as a thin bar, ratios as numbers. */
export function DoctorCompareCard({ filters }: { filters: EpiQueryFilters }) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["epi-breakdown", filters, "doctor"], queryFn: () => epiEndpoints.breakdown(filters, "doctor") });
  const items = [...(data?.items ?? [])].sort((a, b) => b.consultations - a.consultations);
  const max = Math.max(1, ...items.map((i) => i.consultations));
  const bar = (i: EpiBreakdownItem) => (
    <span className="doc-bar"><span className="doc-bar-track"><span className="doc-bar-fill" style={{ width: `${Math.max(2, (i.consultations / max) * 100)}%` }} /></span><strong>{fmt(i.consultations)}</strong></span>
  );

  return (
    <section className="data-card epi-doctors" aria-labelledby="epi-doctors-title">
      <div className="data-card-header">
        <div>
          <h2 id="epi-doctors-title" className="data-card-title">Comparación por médico</h2>
          <p className="data-card-subtitle">Consultas con diagnóstico, pacientes y diagnósticos por consulta</p>
        </div>
      </div>
      <div className="data-card-body">
        {isLoading ? <div className="card-skeleton">{[0, 1, 2].map((k) => <span key={k} className="skeleton" style={{ height: 44 }} />)}</div>
          : isError ? <InlineState kind="error" message="No se pudo cargar la comparación." onRetry={() => void refetch()} />
          : !items.length ? <InlineState message="Ningún médico tiene diagnósticos codificados en este período." />
          : (
            <DataList<EpiBreakdownItem>
              label="Comparación por médico"
              rows={items}
              rowKey={(i) => i.key}
              columns={[
                { key: "doctor", header: "Médico", cell: (i) => <span className="doc-name" title={i.label}>{i.label}</span> },
                { key: "consultations", header: "Consultas", cell: bar, width: "34%" },
                { key: "patients", header: "Pacientes", numeric: true, align: "end", cell: (i) => fmt(i.patients) },
                { key: "ratio", header: "Diagn./consulta", numeric: true, align: "end", cell: (i) => dec(i.consultations ? i.diagnoses / i.consultations : null) },
              ]}
              title={(i) => i.label}
              subtitle={(i) => `${fmt(i.consultations)} consultas · ${fmt(i.patients)} pacientes`}
              detail={(i) => `${dec(i.consultations ? i.diagnoses / i.consultations : null)} diagnósticos por consulta`}
            />
          )}
      </div>
    </section>
  );
}
