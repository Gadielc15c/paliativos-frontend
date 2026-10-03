import { useState } from "react";
import { AlertOctagon, ChevronDown, Eye, Info, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import type { EpiInsightCategory, InsightSeverity } from "../../../types/clinical";
import Change from "./Change";
import { dateLabel, fmt } from "./format";
import { methodLines, plainLine } from "./plain";

const SEVERITY: Record<InsightSeverity, { label: string; icon: typeof Info }> = {
  info: { label: "Info", icon: Info },
  watch: { label: "Vigilar", icon: Eye },
  alert: { label: "Alerta", icon: AlertOctagon },
};

/** Status is never color alone: icon + label, ink text, status hue on the icon/dot only. */
export function SeverityPill({ severity }: { severity: InsightSeverity }) {
  const s = SEVERITY[severity];
  return <span className="sev-pill" data-severity={severity}><s.icon size={14} aria-hidden="true" />{s.label}</span>;
}

/**
 * 12-point sparkline: de-emphasis line, current point in the accent with a surface ring.
 * Each week has a hit column with its own tooltip (bigger than the mark).
 */
export function Sparkline({ points, label }: { points: Array<{ bucket: string; count: number }>; label: string }) {
  const W = 132, H = 40, P = 5;
  if (points.length < 2) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const x = (i: number) => P + (i * (W - P * 2)) / (points.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const step = (W - P * 2) / (points.length - 1);
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img"
      aria-label={`${label}: últimas ${points.length} semanas, de ${points[0].count} a ${last.count} casos`}>
      <path d={`${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} className="sparkline-area" />
      <path d={d} className="sparkline-line" />
      <circle cx={x(points.length - 1)} cy={y(last.count)} r={4} className="sparkline-dot" />
      {points.map((p, i) => (
        <rect key={p.bucket} x={x(i) - step / 2} y={0} width={step} height={H} className="sparkline-hit">
          <title>{`Semana al ${dateLabel(p.bucket)}: ${p.count} casos`}</title>
        </rect>
      ))}
    </svg>
  );
}

interface Props {
  category: EpiInsightCategory;
  active?: boolean;
  /** Filters the whole dashboard to this category. */
  onFilter?: (c: EpiInsightCategory) => void;
  onCode: (code: string, description: string) => void;
}

/** One category: total + sparkline, its most important finding, the rest behind "Ver más". */
export default function InsightCategoryCard({ category: c, active, onFilter, onCode }: Props) {
  const [expanded, setExpanded] = useState(false);
  const previous = (c as EpiInsightCategory & { previous_cases?: number }).previous_cases
    ?? (c.delta_pct !== null && c.delta_pct > -100 ? Math.round(c.total_cases / (1 + c.delta_pct / 100)) : null);
  const shown = expanded ? c.insights : c.insights.slice(0, 1);
  const hidden = c.insights.length - shown.length;

  return (
    <article className={clsx("ins-card", active && "is-active")} aria-label={c.label}>
      <header className="ins-card-head">
        <div className="ins-card-heading">
          <h3 className="ins-card-title">{c.label}</h3>
          <div className="ins-card-total">
            <strong>{fmt(c.total_cases)}</strong>
            <span className="ins-card-unit">{c.total_cases === 1 ? "caso" : "casos"}</span>
            {previous !== null && <Change current={c.total_cases} previous={previous} pct={c.delta_pct} withValue={false} />}
          </div>
        </div>
        <Sparkline points={c.trend} label={c.label} />
      </header>
      {shown.length > 0 && (
        <ul className="ins-rows">
          {shown.map((i) => (
            <li key={i.id} className="ins-row">
              <div className="ins-row-head"><SeverityPill severity={i.severity} /></div>
              <p className="ins-row-line">{plainLine(i, c)}</p>
              {i.codes.length > 0 && (
                <div className="ins-row-codes">
                  {i.codes.slice(0, 3).map((code) => (
                    <button key={code.code} type="button" className="ins-code" onClick={() => onCode(code.code, code.description)}
                      title={`${code.description} · ${code.count} casos. Ver pacientes`} aria-label={`Ver pacientes con ${code.code} ${code.description}`}>
                      <span className="code-pill">{code.code}</span>
                      <span className="ins-code-count">{fmt(code.count)}</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="ins-card-foot">
        {hidden > 0 && (
          <button type="button" className="ins-more" onClick={() => setExpanded(true)}>
            <ChevronDown size={16} aria-hidden="true" />{`Ver más (${hidden})`}
          </button>
        )}
        {onFilter && (
          <button type="button" className="ins-card-filter" onClick={() => onFilter(c)} aria-pressed={!!active}>
            <SlidersHorizontal size={14} aria-hidden="true" />{active ? "Quitar filtro" : "Filtrar panel"}
          </button>
        )}
      </div>
      {c.insights.length > 0 && (
        <details className="epi-method">
          <summary>¿Cómo se calculó?</summary>
          <ul>
            {c.insights.map((i) => methodLines(i).map((line, k) => <li key={`${i.id}-${k}`}>{line}</li>))}
          </ul>
        </details>
      )}
    </article>
  );
}
