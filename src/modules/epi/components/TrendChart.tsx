import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EpiTrendSeries } from "../../../types/clinical";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import { bucketLabel, fmt } from "./format";

export const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

interface TrendChartProps {
  buckets: string[];
  series: EpiTrendSeries[];
  /** Color slot per series key; keeps a code's color stable when others are added or removed. */
  colorOf?: (key: string, index: number) => string;
  height?: number;
}

interface TipProps { active?: boolean; label?: string; payload?: Array<{ dataKey: string; value: number; color: string; name: string }> }
function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="chart-tip">
      <p className="chart-tip-title">{bucketLabel(label)}</p>
      {payload.filter((p) => p.dataKey !== "__area").map((p) => (
        <p key={p.dataKey} className="chart-tip-row">
          <i className="swatch" style={{ background: p.color }} />
          <span className="chart-tip-name">{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/** Time series: 2px lines, ~10% wash for a single series, hairline grid, crosshair tooltip. */
export default function TrendChart({ buckets, series, colorOf = (_k, i) => SERIES_COLORS[i % 4], height }: TrendChartProps) {
  const compact = useIsCompact();
  const data = buckets.map((b) => {
    const row: Record<string, string | number> = { bucket: b };
    series.forEach((s) => { row[s.key] = s.points.find((p) => p.bucket === b)?.value ?? 0; });
    return row;
  });
  const single = series.length === 1;
  const h = height ?? (compact ? 220 : 280);
  return (
    <div className="trend-chart" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: compact ? 4 : 12, bottom: 0, left: compact ? -8 : 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(String(b), compact)} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={compact ? 28 : 16} tickMargin={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={compact ? 32 : 40} tickCount={compact ? 3 : 5}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} />
          {single && (
            <Area dataKey={series[0].key} name={series[0].label} type="linear" stroke={colorOf(series[0].key, 0)} strokeWidth={2}
              fill={colorOf(series[0].key, 0)} fillOpacity={0.1} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          )}
          {!single && series.map((s, i) => (
            <Line key={s.key} dataKey={s.key} name={s.label} type="linear" stroke={colorOf(s.key, i)} strokeWidth={2} dot={false}
              strokeLinecap="round" strokeLinejoin="round" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
