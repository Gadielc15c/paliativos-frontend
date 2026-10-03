import { createContext, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleHelp, FileText, Table2 } from "lucide-react";
import DataList from "../../../components/common/DataList";
import CodePill from "../../../components/clinical/CodePill";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { usePreview } from "../usePreview";
import type { AgentBlock, AgentChartBlock, AgentCodesBlock, AgentExtractionBlock, AgentPatientBlock, AgentTableBlock } from "../../../types/agent";

/** Where the chat is rendered: the narrow side panel prefers cards over wide tables. */
export const SurfaceContext = createContext<"panel" | "page">("page");

const nf = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 1 });
const cell = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? nf.format(v) : v);

function TableBlock({ block }: { block: AgentTableBlock }) {
  const surface = useContext(SurfaceContext);
  const rows = block.rows.map((r, i) => ({ i, r }));
  const [first, ...rest] = block.columns;
  return (
    <figure className="as-block">
      {block.title && <figcaption className="as-block-title">{block.title}</figcaption>}
      <DataList label={block.title ?? "Resultados"} rows={rows} rowKey={(x) => String(x.i)}
        layout={surface === "panel" && block.columns.length > 2 ? "cards" : "auto"}
        className="as-datalist"
        columns={block.columns.map((c, j) => ({
          key: String(j), header: c, numeric: block.rows.every((r) => typeof r[j] === "number" || r[j] === null),
          align: block.rows.every((r) => typeof r[j] === "number" || r[j] === null) ? "end" as const : "start" as const,
          cell: (x: { r: AgentTableBlock["rows"][number] }) => cell(x.r[j]),
        }))}
        title={(x) => cell(x.r[0])}
        subtitle={rest.length ? (x) => rest.map((c, j) => `${c}: ${cell(x.r[j + 1])}`).join(" · ") : undefined} />
      {!first && <p className="as-muted">Sin columnas.</p>}
    </figure>
  );
}

interface TipProps { active?: boolean; label?: string; payload?: Array<{ dataKey: string; value: number; color: string; name: string }> }
function ChartTip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="as-chart-tip">
      <p className="as-chart-tip-title">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey}><i className="as-swatch" style={{ background: p.color }} /><span className="as-chart-tip-name">{p.name}</span><strong>{nf.format(p.value)}</strong></p>
      ))}
    </div>
  );
}

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

function ChartBlock({ block }: { block: AgentChartBlock }) {
  const compact = useIsCompact();
  const [table, setTable] = useState(false);
  // Fixed slot order; a 5th series would fold into "Otros" (never a generated hue).
  const series = block.series.slice(0, 4);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))];
  const data = xs.map((x) => Object.fromEntries([["x", x], ...series.map((s, i) => [`s${i}`, s.points.find((p) => p.x === x)?.y ?? null])]));
  const Chart = block.chart === "bar" ? BarChart : LineChart;
  return (
    <figure className="as-block as-chart-card">
      <div className="as-block-head">
        {block.title && <figcaption className="as-block-title">{block.title}</figcaption>}
        <button type="button" className="as-chip-button" aria-pressed={table} onClick={() => setTable((v) => !v)}>
          <Table2 size={16} aria-hidden="true" /><span>{table ? "Ver gráfico" : "Ver tabla"}</span>
        </button>
      </div>
      {series.length > 1 && (
        <ul className="as-legend" aria-label="Leyenda">
          {series.map((s, i) => <li key={s.name}><i className="as-swatch" style={{ background: SERIES[i] }} /><span>{s.name}</span></li>)}
        </ul>
      )}
      {table ? (
        <DataList label={block.title ?? "Datos del gráfico"} rows={data} rowKey={(r) => String(r.x)} layout="cards"
          columns={[{ key: "x", header: block.x ?? "Período", cell: (r) => String(r.x) }]}
          title={(r) => String(r.x)} subtitle={(r) => series.map((s, i) => `${s.name}: ${cell(r[`s${i}`] as number | null)}`).join(" · ")} />
      ) : (
        <div className="as-chart" style={{ height: compact ? 180 : 200 }} role="img"
          aria-label={`${block.title ?? "Gráfico"}: ${series.map((s) => `${s.name}, último valor ${cell(s.points[s.points.length - 1]?.y)}`).join("; ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2} barCategoryGap="24%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="x" tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                interval="preserveStartEnd" minTickGap={24} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tickCount={4} tick={{ fill: "var(--chart-axis)", fontSize: 12 }} />
              <Tooltip content={<ChartTip />} cursor={block.chart === "bar" ? { fill: "var(--chart-grid)" } : { stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} />
              {series.map((s, i) => block.chart === "bar" ? (
                <Bar key={s.name} dataKey={`s${i}`} name={s.name} fill={SERIES[i]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              ) : (
                <Line key={s.name} dataKey={`s${i}`} name={s.name} type="linear" stroke={SERIES[i]} strokeWidth={2} dot={false}
                  strokeLinecap="round" strokeLinejoin="round" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
              ))}
            </Chart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

const SEX: Record<string, string> = { female: "Mujer", male: "Hombre", F: "Mujer", M: "Hombre", other: "Otro" };

function PatientBlock({ block }: { block: AgentPatientBlock }) {
  const p = block.patient;
  const facts = [p.age != null ? `${p.age} años` : null, p.sex ? SEX[p.sex] ?? p.sex : null, p.doctor].filter(Boolean).join(" · ");
  return (
    <section className="as-block as-patient" aria-label={`Paciente ${p.name}`}>
      <div className="as-patient-head">
        <span className="as-avatar" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase()}</span>
        <div className="as-patient-copy">
          <strong className="as-patient-name" title={p.name}>{p.name}</strong>
          {facts && <span className="as-muted">{facts}</span>}
        </div>
      </div>
      {!!p.active_codes?.length && (
        <div className="code-chip-list as-codes">{p.active_codes.map((c) => <CodePill key={c.code} code={c.code} description={c.description} />)}</div>
      )}
      <Link to={`/patients?patientId=${encodeURIComponent(p.id)}&focus=1`} className="button button-tinted button-sm as-link-button">
        <span className="button-content">Ver ficha<ChevronRight size={16} aria-hidden="true" /></span>
      </Link>
    </section>
  );
}

function CodesBlock({ block }: { block: AgentCodesBlock }) {
  return (
    <section className="as-block">
      {block.title && <p className="as-block-title">{block.title}</p>}
      <ul className="as-code-rows">
        {block.codes.map((c) => (
          <li key={c.code}>
            <CodePill code={c.code} description={c.description} />
            {c.count != null && <span className="as-code-count">{nf.format(c.count)} {c.count === 1 ? "caso" : "casos"}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Confidence in words + icon (never color alone). */
export function Confidence({ value }: { value?: number | null }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  // A label, not a control: plain span styled like a pill.
  if (value >= 0.85) return <span className="as-conf" data-level="high"><CheckCircle2 size={14} aria-hidden="true" />Alta · {pct} %</span>;
  if (value >= 0.6) return <span className="as-conf" data-level="medium"><CircleHelp size={14} aria-hidden="true" />Media · {pct} %</span>;
  return <span className="as-conf" data-level="low"><AlertTriangle size={14} aria-hidden="true" />Baja · revisar</span>;
}

function ExtractionBlock({ block }: { block: AgentExtractionBlock }) {
  const low = block.fields.filter((f) => (f.confidence ?? 1) < 0.6).length;
  const preview = usePreview(block.preview_url);
  return (
    <section className="as-block as-extraction" aria-label={`Datos leídos de ${block.document_name}`}>
      <div className="as-extraction-head">
        <div className="as-extraction-copy">
          <p className="as-block-title">Leído de «{block.document_name}»</p>
          <span className="as-muted">{block.document_type ? `${block.document_type} · ` : ""}{block.fields.length} datos{low ? ` · ${low} por revisar` : ""}</span>
        </div>
      </div>
      <div className="as-extraction-body">
        <div className="as-thumb" aria-hidden={!preview}>
          {preview ? <img src={preview} alt={`Vista previa de ${block.document_name}`} /> : <FileText size={28} aria-hidden="true" />}
        </div>
        <dl className="as-fields">
          {block.fields.map((f) => (
            <div key={f.key} className="as-field">
              <dt>{f.label}</dt>
              <dd><span className="as-field-value">{cell(f.value)}</span><Confidence value={f.confidence} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function Block({ block }: { block: AgentBlock }) {
  switch (block.kind) {
    case "table": return <TableBlock block={block} />;
    case "chart": return <ChartBlock block={block} />;
    case "patient": return <PatientBlock block={block} />;
    case "codes": return <CodesBlock block={block} />;
    case "extraction": return <ExtractionBlock block={block} />;
    default: return null;
  }
}
