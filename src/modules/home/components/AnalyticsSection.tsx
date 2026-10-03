import { useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import NumberFlow from "@number-flow/react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, Table2 } from "lucide-react";
import Button from "../../../components/common/Button";
import Pill from "../../../components/common/Pill";
import AiPill from "../../../components/clinical/AiPill";
import InlineState from "../../../components/clinical/InlineState";
import DataList from "../../../components/common/DataList";
import SegmentedControl from "../../../components/common/SegmentedControl";
import { dashboardEndpoints } from "../../../services/endpoints/dashboard";
import { label } from "../../../utils/labels";
import type { DashboardActivity, DashboardKpis, DashboardQuality, DeltaMetric } from "../../../types/dashboard";
import ActivityChart, { ACTIVITY_SERIES } from "./ActivityChart";
import { bucketLabel, deltaText, fmt, fmtDec, fmtPctValue, fmtUsd } from "./format";

function Delta({ m }: { m: DeltaMetric }) {
  const d = deltaText(m.value, m.previous, m.delta_pct);
  const Icon = d.dir === "up" ? ArrowUpRight : d.dir === "down" ? ArrowDownRight : Minus;
  // Neutral tone: more consultations is not "good" or "bad" by itself.
  return <span className="home-delta" data-dir={d.dir}><Icon size={14} aria-hidden="true" />{d.text}</span>;
}

function Tile({ label: l, value, delta, foot, decimals = 0 }: { label: string; value: number | null; delta?: ReactNode; foot?: ReactNode; decimals?: number }) {
  return (
    <div className="home-kpi">
      <span className="home-kpi-label">{l}</span>
      <span className="home-kpi-main">
        {value === null ? <span className="home-kpi-value">—</span> : (
          <NumberFlow className="home-kpi-value" value={value} locales="es-DO" format={{ maximumFractionDigits: decimals }} />
        )}
        {delta}
        {foot && <span className="home-kpi-foot">{foot}</span>}
      </span>
    </div>
  );
}

function KpiRow({ k, loading }: { k?: DashboardKpis; loading: boolean }) {
  if (loading || !k) return <div className="home-kpis">{[0, 1, 2, 3].map((i) => <span key={i} className="skeleton" style={{ height: 92 }} />)}</div>;
  return (
    <div className="home-kpis">
      <Tile label="Consultas" value={k.consultations.value} delta={<Delta m={k.consultations} />} foot={<span className="home-kpi-prev">vs 30 días antes</span>} />
      <Tile label="Pacientes nuevos" value={k.new_patients.value} delta={<Delta m={k.new_patients} />} foot={<span className="home-kpi-prev">vs 30 días antes</span>} />
      <Tile label="Pacientes activos" value={k.active_patients} foot={<span className="home-kpi-prev">{fmt(k.patients_seen)} atendidos</span>} />
      <Tile label="Días entre consultas (mediana)" value={k.median_days_between_consultations} decimals={1}
        foot={k.avg_consultations_per_patient !== null ? <span className="home-kpi-prev">{fmtDec(k.avg_consultations_per_patient)} consultas por paciente</span> : undefined} />
    </div>
  );
}

function Card({ title, subtitle, action, className, children }: { title: ReactNode; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`data-card home-card ${className ?? ""}`}>
      <div className="data-card-header">
        <div className="home-card-heading">
          <h3 className="data-card-title">{title}</h3>
          {subtitle && <p className="data-card-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="data-card-body">{children}</div>
    </section>
  );
}

function ActivityCard({ q, compact }: { q: { data?: DashboardActivity; isLoading: boolean; isError: boolean; refetch: () => unknown }; compact?: boolean }) {
  const [table, setTable] = useState(false);
  const a = q.data;
  const unit = a?.interval === "day" ? "día" : a?.interval === "week" ? "semana" : "mes";
  return (
    <Card title="Actividad" subtitle={compact ? undefined : a ? `Por ${unit} · ${fmt(a.totals.consultations)} consultas en el período` : "Consultas, notas firmadas y pacientes nuevos"}
      action={a && <Button variant="gray" size="sm" onClick={() => setTable((v) => !v)} aria-pressed={table}><Table2 size={16} aria-hidden="true" /><span>{table ? "Ver gráfico" : "Ver tabla"}</span></Button>}>
      {q.isLoading ? <span className="skeleton" style={{ height: compact ? 168 : 260 }} /> : q.isError || !a ? (
        <InlineState kind="error" message="No se pudo cargar la actividad." onRetry={() => void q.refetch()} />
      ) : a.totals.consultations === 0 ? (
        <p className="home-empty">Todavía no hay consultas en estos 30 días. Las verás aquí en cuanto registres la primera.</p>
      ) : table ? (
        <DataList label="Actividad por período" rows={[...a.series].reverse()} rowKey={(r) => r.bucket}
          columns={[
            { key: "b", header: "Período", cell: (r) => bucketLabel(r.bucket) },
            ...ACTIVITY_SERIES.map((s) => ({ key: s.key, header: s.label, numeric: true, align: "end" as const, cell: (r: DashboardActivity["series"][number]) => fmt(r[s.key]) })),
          ]}
          title={(r) => bucketLabel(r.bucket)}
          subtitle={(r) => ACTIVITY_SERIES.map((s) => `${s.label}: ${fmt(r[s.key])}`).join(" · ")} />
      ) : (
        <div className="home-chart-wrap">
          <ul className="home-legend" aria-label="Leyenda">
            {ACTIVITY_SERIES.map((s) => (
              <li key={s.key}><i className="home-swatch" style={{ background: s.color }} /><span>{s.label}</span><strong>{fmt(a.totals[s.key])}</strong></li>
            ))}
          </ul>
          <ActivityChart data={a} height={compact ? 156 : undefined} />
        </div>
      )}
    </Card>
  );
}

function AgeCard({ k }: { k?: DashboardKpis }) {
  const rows = k?.age_distribution ?? [];
  const max = Math.max(1, ...rows.map((r) => r.patients));
  const total = rows.reduce((n, r) => n + r.patients, 0);
  return (
    <Card title="Edad de los pacientes activos" subtitle={k ? `${fmt(k.active_patients)} pacientes activos` : undefined}>
      {!k ? <span className="skeleton" style={{ height: 220 }} /> : total === 0 ? (
        <p className="home-empty">Sin pacientes activos todavía. Al registrar pacientes con fecha de nacimiento verás su distribución por edad.</p>
      ) : (
        <ul className="home-bars" aria-label="Pacientes activos por grupo de edad">
          {rows.map((r) => (
            <li key={r.key} className="home-bar">
              <span className="home-bar-label">{r.key === "unknown" ? "Sin dato" : r.label}</span>
              <span className="home-bar-track" aria-hidden="true"><span className="home-bar-fill" style={{ width: `${r.patients ? Math.max(2, (r.patients / max) * 100) : 0}%` }} /></span>
              <span className="home-bar-value"><strong>{fmt(r.patients)}</strong><span>{fmtDec(r.share_pct, 0)} %</span></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface QualityItem { key: string; title: string; value: string; detail: string; ratio?: number | null; good: boolean; action?: { label: string; to: string } }

function qualityItems(k: DashboardKpis, quality: DashboardQuality): QualityItem[] {
  const uncoded = k.coded_cie10.denominator - k.coded_cie10.numerator;
  const unsigned = k.signed.denominator - k.signed.numerator;
  const ft = quality.free_text_diagnoses;
  const ms = quality.missing_soap;
  const missingSections = Object.entries(ms.by_section).filter(([, n]) => n > 0).map(([s, n]) => `${label("soapSection", s)} (${fmt(n)})`);
  const dup = quality.duplicate_patients;
  return [
    { key: "coded", title: "Consultas con CIE-10", value: fmtPctValue(k.coded_cie10.pct), ratio: k.coded_cie10.pct, good: uncoded === 0,
      detail: uncoded ? `${fmt(uncoded)} sin código: no cuentan en Epidemiología.` : "Todas las consultas tienen diagnóstico codificado.",
      action: uncoded ? { label: "Codificar", to: "/patients?filter=missing_diagnosis" } : undefined },
    { key: "signed", title: "Notas firmadas", value: fmtPctValue(k.signed.pct), ratio: k.signed.pct, good: unsigned === 0,
      detail: unsigned ? `${fmt(unsigned)} ${unsigned === 1 ? "borrador sin firmar" : "borradores sin firmar"}.` : "Todas las notas del período están firmadas.",
      action: unsigned ? { label: "Firmar", to: "/patients?filter=unsigned_drafts" } : undefined },
    { key: "free", title: "Diagnósticos en texto libre", value: fmt(ft.total), good: ft.total === 0,
      detail: ft.total ? `Por pasar a CIE-10. Ej.: «${ft.sample[0]?.text ?? ""}» (${ft.sample[0]?.patient.display_name ?? ""}).` : "Ningún diagnóstico antiguo pendiente de codificar.",
      action: ft.total && ft.sample[0] ? { label: "Revisar", to: `/patients?patientId=${ft.sample[0].patient.id}&focus=1&tab=history` } : undefined },
    { key: "soap", title: "Notas incompletas", value: fmt(ms.consultations_incomplete), good: ms.consultations_incomplete === 0,
      detail: ms.consultations_incomplete ? `Falta: ${missingSections.join(", ")}.` : `Las ${fmt(ms.consultations_checked)} notas firmadas tienen las secciones clave.`,
      action: ms.sample[0] ? { label: "Completar", to: `/consultations/${ms.sample[0].consultation_id}` } : undefined },
    { key: "dup", title: "Posibles pacientes duplicados", value: fmt(dup.length), good: dup.length === 0,
      detail: dup.length ? `${dup[0].patients.map((p) => p.display_name).join(" y ")} ${dup[0].reason === "document" ? "comparten documento" : "tienen el mismo nombre y nacimiento"}.` : "No se encontraron fichas repetidas.",
      action: dup[0] ? { label: "Revisar", to: `/patients?patientId=${dup[0].patients[0].id}` } : undefined },
  ];
}

function QualityRows({ items, compact }: { items: QualityItem[]; compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <ul className="home-quality" data-compact={compact || undefined}>
      {items.map((it) => (
        <li key={it.key} className="home-quality-row" data-good={it.good}>
          <span className="home-quality-copy">
            <span className="home-quality-head"><span className="home-quality-title">{it.title}</span><strong className="home-quality-value">{it.value}</strong></span>
            {!compact && it.ratio !== undefined && it.ratio !== null && (
              <span className="home-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, it.ratio))}%` }} /></span>
            )}
            <span className="home-quality-detail" title={it.detail}>{it.detail}</span>
          </span>
          {it.action ? (
            <Button variant="tinted" size="sm" className="home-quality-action" onClick={() => navigate(it.action!.to)}>{it.action.label}</Button>
          ) : <Pill tone="success">Al día</Pill>}
        </li>
      ))}
    </ul>
  );
}

function QualityCard({ k, quality, loading, isError, refetch }: { k?: DashboardKpis; quality?: DashboardQuality; loading: boolean; isError: boolean; refetch: () => unknown }) {
  if (loading) return <Card title="Calidad de los datos"><span className="skeleton" style={{ height: 260 }} /></Card>;
  if (isError || !quality || !k) return <Card title="Calidad de los datos"><InlineState kind="error" message="No se pudo revisar la calidad de los datos." onRetry={() => void refetch()} /></Card>;
  return (
    <Card title="Calidad de los datos · cada punto tiene su arreglo">
      <QualityRows items={qualityItems(k, quality)} />
    </Card>
  );
}

/** Resumen: what to fix first (up to 3 open quality points). */
function ToReviewCard({ k, quality, onAll }: { k?: DashboardKpis; quality?: DashboardQuality; onAll: () => void }) {
  if (!k || !quality) return <Card title="Por revisar"><span className="skeleton" style={{ height: 190 }} /></Card>;
  const open = qualityItems(k, quality).filter((i) => !i.good);
  return (
    <Card title="Por revisar" subtitle={open.length ? `${fmt(open.length)} ${open.length === 1 ? "punto de calidad abierto" : "puntos de calidad abiertos"}` : "Calidad de los datos"}
      action={open.length > 3 ? <Button variant="gray" size="sm" onClick={onAll}>Ver todo</Button> : undefined}>
      {open.length === 0 ? <p className="home-empty">Todo al día: notas firmadas, codificadas y sin duplicados.</p> : <QualityRows items={open.slice(0, 3)} compact />}
    </Card>
  );
}

function AiCard({ k }: { k?: DashboardKpis }) {
  if (!k) return <Card title="Uso de la IA"><span className="skeleton" style={{ height: 200 }} /></Card>;
  const ai = k.ai;
  return (
    <Card title={<span className="home-ai-title">Uso de la IA <AiPill /></span>} subtitle="Notas preparadas y transcripciones del período">
      {ai.draft_notes_generated === 0 && ai.transcriptions === 0 ? (
        <p className="home-empty">Aún no se usa la IA. En una consulta pulsa «Grabar consulta» o «✦ Preparar nota con IA» para escribir menos.</p>
      ) : (
        <dl className="home-facts">
          <div><dt>Notas preparadas con IA</dt><dd>{fmt(ai.draft_notes_generated)}</dd></div>
          <div className="has-meter">
            <dt>Aceptadas por el médico</dt>
            <dd>{fmtPctValue(ai.acceptance_rate_pct)}</dd>
            <span className="home-meter" aria-hidden="true"><span style={{ width: `${ai.acceptance_rate_pct ?? 0}%` }} /></span>
            <span className="home-fact-note">{fmt(ai.draft_notes_accepted)} tal cual · {fmt(ai.draft_notes_edited)} con cambios · {fmt(ai.draft_notes_rejected)} descartadas</span>
          </div>
          <div><dt>Pendientes de revisar</dt><dd>{fmt(ai.draft_notes_pending)}</dd></div>
          <div><dt>Consultas transcritas</dt><dd>{fmt(ai.transcriptions)}</dd></div>
          <div><dt>Minutos de audio</dt><dd>{fmtDec(ai.transcription_minutes)} min</dd></div>
          <div><dt>Coste de transcripción</dt><dd>{fmtUsd(ai.transcription_cost_usd)}</dd></div>
        </dl>
      )}
    </Card>
  );
}

function WorkloadCard({ a }: { a?: DashboardActivity }) {
  const navigate = useNavigate();
  const [all, setAll] = useState(false);
  const allRows = a?.workload ?? [];
  const rows = all ? allRows : allRows.slice(0, 5);
  const max = Math.max(1, ...allRows.map((r) => r.consultations));
  return (
    <Card title="Carga por médico" subtitle="Consultas del período, pacientes activos y notas sin firmar"
      action={allRows.length > 5 ? <Button variant="gray" size="sm" aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? "Ver menos" : `Ver todos (${fmt(allRows.length)})`}</Button> : undefined}>
      {!a ? <span className="skeleton" style={{ height: 200 }} /> : rows.length === 0 ? (
        <p className="home-empty">Sin médicos con actividad. Agrega profesionales desde Administración › Equipo.</p>
      ) : (
        <ul className="home-workload">
          {rows.map((r) => (
            <li key={r.doctor_id} className="home-work-row" data-inactive={!r.is_active || undefined}>
              <span className="home-work-name">
                <strong title={r.doctor_name}>{r.doctor_name}</strong>
                {!r.is_active && <Pill tone="warning">Inactivo</Pill>}
              </span>
              <span className="home-work-bar">
                <span className="home-bar-track" aria-hidden="true"><span className="home-bar-fill" style={{ width: `${r.consultations ? Math.max(2, (r.consultations / max) * 100) : 0}%` }} /></span>
                <span className="home-work-count"><strong>{fmt(r.consultations)}</strong> consultas</span>
              </span>
              <span className="home-work-facts">
                <span>{fmt(r.active_patients)} pacientes activos</span>
                <span>{r.unsigned_drafts ? `${fmt(r.unsigned_drafts)} sin firmar` : "Notas al día"}</span>
                <span>{r.avg_days_to_sign === null ? "—" : `firma en ${fmtDec(r.avg_days_to_sign)} días`}</span>
              </span>
              {!r.is_active && r.active_patients > 0 && (
                <Button variant="tinted" size="sm" className="home-work-action" onClick={() => navigate("/equipo?role=doctor")}>Reasignar <ChevronRight size={16} aria-hidden="true" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Panel = "resumen" | "actividad" | "calidad" | "ia" | "equipo";
const PANELS: Panel[] = ["resumen", "actividad", "calidad", "ia", "equipo"];

/** Analytics for clinical roles (kpis/activity/quality need clinical:read). KPIs always visible; one panel at a time. */
export default function AnalyticsSection({ isAdmin }: { isAdmin: boolean }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("panel") as Panel | null;
  const panel: Panel = raw && PANELS.includes(raw) && (raw !== "equipo" || isAdmin) ? raw : "resumen";
  const setPanel = (p: Panel) => setParams((prev) => { const n = new URLSearchParams(prev); if (p === "resumen") n.delete("panel"); else n.set("panel", p); return n; }, { replace: true });
  const kpis = useQuery({ queryKey: ["dashboard", "kpis"], queryFn: () => dashboardEndpoints.kpis(), staleTime: 5 * 60 * 1000, retry: 1 });
  const activity = useQuery({ queryKey: ["dashboard", "activity"], queryFn: () => dashboardEndpoints.activity(), staleTime: 5 * 60 * 1000, retry: 1 });
  const quality = useQuery({ queryKey: ["dashboard", "quality"], queryFn: () => dashboardEndpoints.quality(), staleTime: 5 * 60 * 1000, retry: 1 });
  const segments = [
    { value: "resumen" as const, label: "Resumen" },
    { value: "actividad" as const, label: "Actividad" },
    { value: "calidad" as const, label: "Calidad" },
    { value: "ia" as const, label: "IA" },
    ...(isAdmin ? [{ value: "equipo" as const, label: "Equipo" }] : []),
  ];
  const refetchQuality = () => { void quality.refetch(); void kpis.refetch(); };

  return (
    <section className="home-section" aria-labelledby="home-analytics-title">
      <header className="home-section-head">
        <h2 id="home-analytics-title" className="home-section-title">Tu práctica en números</h2>
        <p className="home-section-meta home-section-meta-grow">Últimos 30 días</p>
        <SegmentedControl label="Análisis" segments={segments} value={panel} onChange={setPanel} className="home-panels-tabs" />
      </header>
      {kpis.isError ? (
        <div className="data-card"><div className="data-card-body"><InlineState kind="error" message="No se pudieron cargar los indicadores." onRetry={() => void kpis.refetch()} /></div></div>
      ) : <KpiRow k={kpis.data} loading={kpis.isLoading} />}
      <div className="home-grid home-panel" role="tabpanel" aria-label={segments.find((s) => s.value === panel)?.label}>
        {panel === "resumen" && <>
          <div className="home-span-7"><ActivityCard q={activity} compact /></div>
          <div className="home-span-5"><ToReviewCard k={kpis.data} quality={quality.data} onAll={() => setPanel("calidad")} /></div>
        </>}
        {panel === "actividad" && <>
          <div className="home-span-8"><ActivityCard q={activity} /></div>
          <div className="home-span-4"><AgeCard k={kpis.data} /></div>
        </>}
        {panel === "calidad" && <div className="home-span-12"><QualityCard k={kpis.data} quality={quality.data} loading={quality.isLoading || kpis.isLoading} isError={quality.isError || kpis.isError} refetch={refetchQuality} /></div>}
        {panel === "ia" && <div className="home-span-12"><AiCard k={kpis.data} /></div>}
        {panel === "equipo" && isAdmin && <div className="home-span-12"><WorkloadCard a={activity.data} /></div>}
      </div>
    </section>
  );
}
