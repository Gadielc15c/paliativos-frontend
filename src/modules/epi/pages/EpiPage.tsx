import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Table2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/common/Button";
import SegmentedControl from "../../../components/common/SegmentedControl";
import CodePill from "../../../components/clinical/CodePill";
import InlineState from "../../../components/clinical/InlineState";
import Sheet from "../../../components/common/Sheet";
import Icd10Search from "../../../components/clinical/Icd10Search";
import DataList from "../../../components/common/DataList";
import { epiEndpoints } from "../../../services/endpoints";
import { useAppStore } from "../../../app/store/useAppStore";
import type { EpiBreakdownBy } from "../../../types/clinical";
import { useEpiFilters } from "../components/useEpiFilters";
import EpiFilterBar from "../components/EpiFilterBar";
import KpiTiles from "../components/KpiTiles";
import TrendChart, { SERIES_COLORS } from "../components/TrendChart";
import ChartLegend from "../components/ChartLegend";
import BarList from "../components/BarList";
import Pyramid from "../components/Pyramid";
import DrilldownSheet from "../components/DrilldownSheet";
import InsightsCard, { useEpiInsights } from "../components/InsightsCard";
import HighlightsCard from "../components/HighlightsCard";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import { DoctorCompareCard, PatientFlowCard } from "../components/MoreAnalytics";
import { CATEGORY_LABELS } from "../components/plain";
import AskCard from "../components/AskCard";
import { bucketLabel, dateLabel, fmt } from "../components/format";
import "../../../components/clinical/clinical.css";
import "./EpiPage.css";

const MAX_COMPARE = 4;

function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="card-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton" style={{ height: 40, width: `${92 - i * 9}%` }} />)}</div>;
}

export default function EpiPage() {
  const ctl = useEpiFilters();
  const { filters, interval, compareCodes, set } = ctl;
  const isAdmin = useAppStore((s) => s.user?.role === "admin");
  const askRef = useRef<HTMLInputElement>(null);
  // Drill-down lives in the URL (?dx=C34.9) so it can be shared and reopened.
  const dx = ctl.params.get("dx");
  const drill = dx ? { code: dx, description: ctl.params.get("dxd") || undefined } : null;
  const setDrill = (d: { code: string; description?: string } | null) => set({ dx: d?.code ?? null, dxd: d?.description ?? null });
  const [compareOpen, setCompareOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [by, setBy] = useState<EpiBreakdownBy>("age_sex");

  const summary = useQuery({ queryKey: ["epi-summary", filters], queryFn: () => epiEndpoints.summary(filters) });
  const top = useQuery({ queryKey: ["epi-top", filters], queryFn: () => epiEndpoints.top(filters, 10) });
  // Default comparison: the three most frequent categories of the period.
  const defaultCodes = useMemo(() => [...new Set((top.data?.items ?? []).map((i) => i.code.slice(0, 3)))].slice(0, 3), [top.data]);
  const codes = compareCodes.length ? compareCodes : defaultCodes;
  const trend = useQuery({
    queryKey: ["epi-trend", filters, interval, codes],
    queryFn: () => epiEndpoints.trend(filters, { interval, codes }),
    enabled: compareCodes.length > 0 || top.isSuccess,
  });
  const breakdown = useQuery({ queryKey: ["epi-breakdown", filters, by], queryFn: () => epiEndpoints.breakdown(filters, by) });
  const insights = useEpiInsights(filters);
  const seasonKeys = useMemo(() => {
    const present = (insights.data?.categories ?? []).filter((c) => c.total_cases > 0).map((c) => c.category_key);
    return (present.length ? present : Object.keys(CATEGORY_LABELS)).filter((k) => k !== "other" && k in CATEGORY_LABELS);
  }, [insights.data]);
  const trendRef = useRef<HTMLElement>(null);
  const showTrendFor = (code: string) => {
    setCodes([code.slice(0, 3)]);
    requestAnimationFrame(() => trendRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const filterCategory = (c: { category_key: string; label: string } | null) => set({ cat: c?.category_key ?? null, catl: c?.label ?? null, chapter: null });

  const slot = (key: string, i: number) => SERIES_COLORS[(codes.indexOf(key) >= 0 ? codes.indexOf(key) : i) % SERIES_COLORS.length];
  const setCodes = (next: string[]) => set({ codes: next.length ? next.join(",") : null });
  const empty = summary.isSuccess && summary.data.diagnoses.value === 0;
  const periodText = summary.data ? `${dateLabel(summary.data.period.date_from)} – ${dateLabel(summary.data.period.date_to)}` : "";

  return (
    <div className="data-screen epi-page">
      <PageHeader
        eyebrow="Análisis clínico"
        title="Epidemiología"
        description={periodText ? `Diagnósticos codificados con CIE-10 · ${periodText}` : "Diagnósticos codificados con CIE-10 de tus pacientes."}
        actions={
          <Button variant="tinted" className="epi-ask-jump" onClick={() => { askRef.current?.focus(); askRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>
            <Sparkles size={18} aria-hidden="true" /><span>Pregúntale a tus datos</span>
          </Button>
        }
        filters={<EpiFilterBar ctl={ctl} />}
      />

      <HighlightsCard filters={filters} onPatients={(code, description) => setDrill({ code, description })} onTrend={showTrendFor}
        onCategory={filterCategory} onWiden={() => set({ period: "90d", from: null, to: null })} />

      <h2 className="epi-section-title">Resumen del período</h2>
      {summary.isError ? (
        <section className="data-card"><div className="data-card-body">
          <InlineState kind="error" message="No se pudieron cargar los indicadores. Revisa tu conexión e inténtalo de nuevo." onRetry={() => void summary.refetch()} />
        </div></section>
      ) : (
        <section className="epi-section" aria-label="Indicadores">
          <KpiTiles data={summary.data} loading={summary.isLoading} />
          {summary.data && summary.data.data_quality.consultations_total > 0 && (
            <p className="epi-quality">
              {fmt(summary.data.data_quality.consultations_without_diagnosis)} consultas sin diagnóstico y {fmt(summary.data.data_quality.consultations_unsigned)} sin firmar en el período. No se cuentan hasta que se codifiquen.
            </p>
          )}
        </section>
      )}

      {empty ? (
        <section className="data-card"><div className="data-card-body">
          <InlineState message="No hay diagnósticos codificados con estos filtros. Prueba con un período más amplio o quita algún filtro.">
            <Button variant="gray" onClick={() => set({ period: "12m", from: null, to: null, doctor: null, sex: null, age: null, chapter: null, code: null, cat: null, catl: null })}>Ver últimos 12 meses sin filtros</Button>
          </InlineState>
        </div></section>
      ) : (
        <>
          <InsightsCard filters={filters} activeKey={ctl.params.get("cat")} onOpenCode={(code, description) => setDrill({ code, description })}
            onCategory={filterCategory} />

          <h2 className="epi-section-title">Tendencias y distribución</h2>
          <section ref={trendRef} className="data-card epi-trend" aria-labelledby="epi-trend-title">
            <div className="data-card-header">
              <div>
                <h2 id="epi-trend-title" className="data-card-title">Tendencia</h2>
                <p className="data-card-subtitle">Diagnósticos por {interval === "day" ? "día" : interval === "week" ? "semana" : "mes"}{compareCodes.length ? "" : " · categorías más frecuentes"}</p>
              </div>
              <Button variant="gray" size="sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                <Table2 size={16} aria-hidden="true" /><span>{showTable ? "Ver gráfico" : "Ver tabla"}</span>
              </Button>
            </div>
            <div className="data-card-body epi-trend-body">
              <div className="epi-compare" aria-label="Códigos comparados">
                {codes.map((c) => (
                  <span key={c} className="epi-compare-item">
                    <CodePill code={c} onRemove={codes.length > 1 ? () => setCodes(codes.filter((x) => x !== c)) : undefined} />
                  </span>
                ))}
                {codes.length < MAX_COMPARE && (
                  <button type="button" className="filter-clear" onClick={() => setCompareOpen(true)}><Plus size={16} aria-hidden="true" />Comparar código</button>
                )}
              </div>
              {trend.isLoading || (!trend.data && top.isLoading) ? <span className="skeleton" style={{ height: 260 }} /> : trend.isError ? (
                <InlineState kind="error" message="No se pudo cargar la tendencia." onRetry={() => void trend.refetch()} />
              ) : trend.data && (showTable ? (
                <DataList
                  label="Tendencia por período"
                  rows={trend.data.buckets}
                  rowKey={(b) => b}
                  columns={[
                    { key: "bucket", header: "Período", cell: (b: string) => bucketLabel(b) },
                    ...trend.data.series.map((s) => ({ key: s.key, header: s.key === "total" ? "Total" : s.key, numeric: true, align: "end" as const, cell: (b: string) => fmt(s.points.find((p) => p.bucket === b)?.value ?? 0) })),
                  ]}
                  title={(b) => bucketLabel(b)}
                  subtitle={(b) => trend.data!.series.map((s) => `${s.key === "total" ? "Total" : s.key}: ${s.points.find((p) => p.bucket === b)?.value ?? 0}`).join(" · ")}
                />
              ) : (
                <>
                  {trend.data.series.length > 1 && <ChartLegend items={trend.data.series.map((s) => s.label)} colors={trend.data.series.map((s, i) => slot(s.key, i))} />}
                  <TrendChart buckets={trend.data.buckets} series={trend.data.series} colorOf={slot} />
                </>
              ))}
            </div>
          </section>

          <div className="epi-two">
            <section className="data-card" aria-labelledby="epi-top-title">
              <div className="data-card-header">
                <div>
                  <h2 id="epi-top-title" className="data-card-title">Diagnósticos más frecuentes</h2>
                  <p className="data-card-subtitle">{top.data ? `${fmt(top.data.total_diagnoses)} diagnósticos · toca uno para ver pacientes` : "Top 10 del período"}</p>
                </div>
              </div>
              <div className="data-card-body">
                {top.isLoading ? <CardSkeleton rows={6} /> : top.isError ? (
                  <InlineState kind="error" message="No se pudo cargar el ranking." onRetry={() => void top.refetch()} />
                ) : (
                  <BarList label="Diagnósticos más frecuentes" showRank onSelect={(it) => setDrill({ code: it.code!, description: it.label })}
                    items={(top.data?.items ?? []).map((i) => ({ key: i.code, code: i.code, label: i.description, value: i.count, delta: i.delta, deltaPct: i.delta_pct, previous: i.previous_count, meta: `${fmt(i.patients)} ${i.patients === 1 ? "paciente" : "pacientes"} · ${String(i.share_pct).replace(".", ",")}%` }))} />
                )}
              </div>
            </section>

            <section className="data-card" aria-labelledby="epi-breakdown-title">
              <div className="data-card-header epi-breakdown-head">
                <h2 id="epi-breakdown-title" className="data-card-title">Distribución</h2>
                <SegmentedControl label="Agrupar por" value={by} onChange={setBy}
                  segments={[
                    { value: "age_sex", label: "Edad y sexo" },
                    { value: "chapter", label: "Capítulo" },
                  ]} />
              </div>
              <div className="data-card-body">
                {breakdown.isLoading ? <CardSkeleton rows={5} /> : breakdown.isError ? (
                  <InlineState kind="error" message="No se pudo cargar la distribución." onRetry={() => void breakdown.refetch()} />
                ) : breakdown.data && (by === "age_sex" ? <Pyramid items={breakdown.data.items} /> : (
                  <BarList label="Distribución" items={breakdown.data.items.map((i) => ({ key: i.key, label: i.label, value: i.diagnoses, meta: `${fmt(i.patients)} pacientes · ${String(i.share_pct).replace(".", ",")}%` }))} />
                ))}
              </div>
            </section>
          </div>

          <h2 className="epi-section-title">Más análisis</h2>
          <SeasonalityHeatmap filters={filters} categories={seasonKeys} />
          <div className={isAdmin ? "epi-two is-even" : "epi-one"}>
            <PatientFlowCard filters={filters} />
            {isAdmin && <DoctorCompareCard filters={filters} />}
          </div>
        </>
      )}


      <AskCard inputRef={askRef} initialQuestion={ctl.params.get("ask") ?? undefined} onOpenCode={(code, description) => setDrill({ code, description })} />

      <DrilldownSheet code={drill?.code ?? null} description={drill?.description} filters={filters} onClose={() => setDrill(null)} />
      <Sheet open={compareOpen} onClose={() => setCompareOpen(false)} title="Comparar código" subtitle={`Hasta ${MAX_COMPARE} códigos o categorías en la tendencia.`}>
        <Icd10Search autoFocus exclude={codes} onSelect={(c) => { setCodes([...codes, c.code].slice(0, MAX_COMPARE)); setCompareOpen(false); }} />
      </Sheet>
    </div>
  );
}
