import NumberFlow from "@number-flow/react";
import type { EpiSummary } from "../../../types/clinical";
import Change from "./Change";
import { isSmall } from "./format";

const TILES: Array<{ key: keyof Pick<EpiSummary, "consultations" | "patients" | "diagnoses" | "distinct_codes">; label: string }> = [
  { key: "consultations", label: "Consultas" },
  { key: "patients", label: "Pacientes" },
  { key: "diagnoses", label: "Diagnósticos" },
  { key: "distinct_codes", label: "Códigos distintos" },
];

export default function KpiTiles({ data, loading }: { data?: EpiSummary; loading: boolean }) {
  return (
    <div className="epi-kpis" aria-busy={loading || undefined}>
      {TILES.map(({ key, label }) => (
        <div key={key} className="epi-kpi">
          <span className="epi-kpi-label">{label}</span>
          {loading || !data ? (
            <><span className="skeleton" style={{ width: "56%", height: 34 }} /><span className="skeleton" style={{ width: 72, height: 22 }} /></>
          ) : (
            <>
              <NumberFlow className="epi-kpi-value" value={data[key].value} locales="es-DO" />
              <span className="epi-kpi-foot">
                <Change current={data[key].value} previous={data[key].previous} pct={data[key].delta_pct} withValue={false} />
                {!isSmall(data[key].value, data[key].previous) && <span className="epi-kpi-prev">antes {data[key].previous.toLocaleString("es-DO")}</span>}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
