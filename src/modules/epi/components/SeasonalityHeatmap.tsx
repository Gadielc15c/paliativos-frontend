import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Table2 } from "lucide-react";
import Button from "../../../components/common/Button";
import DataList from "../../../components/common/DataList";
import InlineState from "../../../components/clinical/InlineState";
import { epiEndpoints } from "../../../services/endpoints";
import { bucketLabel, fmt } from "./format";
import { CATEGORY_LABELS } from "./plain";
import type { EpiQueryFilters } from "./useEpiFilters";

const STEPS = [0, 12, 30, 52, 76, 100]; // % of the series hue mixed into the surface (one hue, light → dark)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Row { key: string; label: string; values: number[]; total: number }

/**
 * Seasonality: month × disease category over the last 12 months (always 12, whatever the period
 * filter, so the seasons are comparable). Sequential single hue, scaled per row: the darkest cell is
 * the month with most cases of that category. One /epi/trend call per category (category filter).
 */
export default function SeasonalityHeatmap({ filters, categories }: { filters: EpiQueryFilters; categories: string[] }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const range = useMemo(() => {
    const now = new Date();
    return { date_from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), date_to: iso(now) };
  }, []);
  const base: EpiQueryFilters = { doctor_id: filters.doctor_id, sex: filters.sex, age_group: filters.age_group, ...range };
  const keys = categories.slice(0, 8);
  const results = useQueries({
    queries: keys.map((category) => ({
      queryKey: ["epi-season", base, category],
      queryFn: () => epiEndpoints.trend({ ...base, category } as EpiQueryFilters, { interval: "month" }),
      staleTime: 10 * 60 * 1000,
    })),
  });
  const loading = results.some((r) => r.isLoading);
  const failed = results.find((r) => r.isError);
  const buckets = results.find((r) => r.data)?.data?.buckets ?? [];
  const rows: Row[] = keys.map((k, i) => {
    const series = results[i]?.data?.series[0];
    const values = buckets.map((b) => series?.points.find((p) => p.bucket === b)?.value ?? 0);
    return { key: k, label: CATEGORY_LABELS[k] ?? k, values, total: values.reduce((a, v) => a + v, 0) };
  }).filter((r) => r.total > 0);

  const step = (v: number, max: number) => (v === 0 ? 0 : Math.min(STEPS.length - 1, 1 + Math.floor((v / Math.max(1, max)) * (STEPS.length - 2) - 1e-9)));

  return (
    <section className="data-card epi-season" aria-labelledby="epi-season-title">
      <div className="data-card-header">
        <div>
          <h2 id="epi-season-title" className="data-card-title">Estacionalidad</h2>
          <p className="data-card-subtitle">Casos por mes en los últimos 12 meses · más oscuro = el mes con más casos de esa categoría</p>
        </div>
        {rows.length > 0 && (
          <Button variant="gray" size="sm" onClick={() => setTable((v) => !v)} aria-pressed={table}>
            <Table2 size={16} aria-hidden="true" /><span>{table ? "Ver mapa" : "Ver tabla"}</span>
          </Button>
        )}
      </div>
      <div className="data-card-body epi-season-body">
        {loading ? <span className="skeleton" style={{ height: 220 }} /> : failed ? (
          <InlineState kind="error" message="No se pudo calcular la estacionalidad." onRetry={() => void failed.refetch()} />
        ) : rows.length === 0 ? (
          <InlineState message="Aún no hay diagnósticos suficientes para ver la estacionalidad. Se completa a medida que codificas consultas con CIE-10." />
        ) : table ? (
          <DataList<Row>
            label="Casos por mes y categoría"
            rows={rows}
            rowKey={(r) => r.key}
            columns={[
              { key: "label", header: "Categoría", cell: (r) => r.label },
              ...buckets.map((b, i) => ({ key: b, header: bucketLabel(b, true), numeric: true, align: "end" as const, cell: (r: Row) => fmt(r.values[i]) })),
            ]}
            title={(r) => r.label}
            subtitle={(r) => buckets.map((b, i) => `${bucketLabel(b, true)} ${r.values[i]}`).join(" · ")}
            detail={(r) => `${fmt(r.total)} casos`}
          />
        ) : (
          <>
            <div className="heatmap" role="img" aria-label={`Estacionalidad: ${rows.map((r) => `${r.label}, máximo en ${bucketLabel(buckets[r.values.indexOf(Math.max(...r.values))])}`).join("; ")}`}
              style={{ gridTemplateColumns: `minmax(92px, 168px) repeat(${buckets.length}, minmax(16px, 1fr))` }} onMouseLeave={() => setHover(null)}>
              <span />
              {buckets.map((b) => <span key={b} className="heatmap-month" title={bucketLabel(b)}><span className="m-long">{bucketLabel(b, true)}</span><span className="m-short">{bucketLabel(b, true).charAt(0).toUpperCase()}</span></span>)}
              {rows.map((r) => {
                const max = Math.max(...r.values);
                return [
                  <span key={`${r.key}-l`} className="heatmap-label" title={r.label}>{r.label}</span>,
                  ...r.values.map((v, i) => (
                    <span key={`${r.key}-${buckets[i]}`} className="heatmap-cell" data-step={step(v, max)}
                      style={{ background: `color-mix(in srgb, var(--series-1) ${STEPS[step(v, max)]}%, var(--surface-muted))` }}
                      title={`${r.label} · ${bucketLabel(buckets[i])}: ${fmt(v)} ${v === 1 ? "caso" : "casos"}`}
                      onMouseEnter={() => setHover(`${r.label} · ${bucketLabel(buckets[i])}: ${fmt(v)} ${v === 1 ? "caso" : "casos"}`)} />
                  )),
                ];
              })}
            </div>
            <div className="heatmap-foot">
              <span className="heatmap-legend" aria-hidden="true">
                <span>Menos</span>
                {STEPS.map((s, i) => <i key={i} style={{ background: `color-mix(in srgb, var(--series-1) ${s}%, var(--surface-muted))` }} />)}
                <span>Más</span>
              </span>
              <span className="heatmap-readout" aria-live="polite">{hover ?? "Pasa el cursor por una celda para ver los casos."}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
