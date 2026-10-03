import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import type { DashboardActivity } from "../../../types/dashboard";
import { bucketLabel, fmt } from "./format";

export const ACTIVITY_SERIES = [
  { key: "consultations", label: "Consultas", color: "var(--series-1)" },
  { key: "signed_notes", label: "Notas firmadas", color: "var(--series-2)" },
  { key: "new_patients", label: "Pacientes nuevos", color: "var(--series-3)" },
] as const;

interface TipProps { active?: boolean; label?: string; payload?: Array<{ dataKey: string; value: number; color: string; name: string }> }
function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="chart-tip home-chart-tip">
      <p className="chart-tip-title">{bucketLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tip-row">
          <i className="home-swatch" style={{ background: p.color }} />
          <span className="chart-tip-name">{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/** Three counts on one axis (same unit): 2px linear lines, hairline grid, crosshair tooltip. */
export default function ActivityChart({ data, height }: { data: DashboardActivity; height?: number }) {
  const compact = useIsCompact();
  const max = Math.max(0, ...data.series.flatMap((r) => ACTIVITY_SERIES.map((s) => r[s.key])));
  const axisWidth = Math.max(compact ? 32 : 40, fmt(max).length * 8 + 14);
  return (
    <div className="home-chart" style={{ height: height ?? (compact ? 220 : 260) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.series} margin={{ top: 8, right: compact ? 4 : 12, bottom: 0, left: compact ? -8 : 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(String(b))} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={compact ? 32 : 20} tickMargin={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={axisWidth} tickCount={compact ? 3 : 5}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} isAnimationActive={false} />
          {ACTIVITY_SERIES.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} type="linear" stroke={s.color} strokeWidth={2} dot={false}
              strokeLinecap="round" strokeLinejoin="round" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
