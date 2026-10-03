import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { fmt, fmtPct } from "./format";
import Change from "./Change";

export interface BarItem {
  key: string;
  label: string;
  value: number;
  code?: string;
  /** Secondary fact under the label (e.g. "9 pacientes · 30%"). */
  meta?: string;
  deltaPct?: number | null;
  delta?: number;
  /** Previous-period count: enables the small-numbers rule ("9 casos (antes 1)"). */
  previous?: number;
}

interface BarListProps {
  items: BarItem[];
  label: string;
  onSelect?: (item: BarItem) => void;
  showRank?: boolean;
  unit?: string;
}

/**
 * Ranked horizontal bars (thin, rounded data-end, square at the baseline).
 * Value labels sit at the tip in text ink; the bar carries identity only.
 */
export default function BarList({ items, label, onSelect, showRank, unit = "diagnósticos" }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="bar-list" aria-label={label}>
      {items.map((item, i) => {
        const body = (
          <>
            {showRank && <span className="bar-rank" aria-hidden="true">{i + 1}</span>}
            <span className="bar-copy">
              <span className="bar-head">
                {item.code && <span className="code-pill">{item.code}</span>}
                <span className="bar-label" title={item.label}>{item.label}</span>
              </span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
              </span>
              {(item.meta || item.delta !== undefined) && (
                <span className="bar-meta">
                  {item.meta}
                  {item.previous !== undefined ? <Change current={item.value} previous={item.previous} pct={item.deltaPct} /> : item.delta !== undefined && (
                    <span className="epi-delta" data-dir={item.delta > 0 ? "up" : item.delta < 0 ? "down" : "flat"} title="Cambio frente al período anterior">
                      {item.deltaPct === null || item.deltaPct === undefined ? (item.delta > 0 ? "Nuevo" : "=") : fmtPct(item.deltaPct)}
                    </span>
                  )}
                </span>
              )}
            </span>
            <span className="bar-value">
              <strong>{fmt(item.value)}</strong>
            </span>
            {onSelect && <ChevronRight className="bar-chevron" size={18} aria-hidden="true" />}
          </>
        );
        return (
          <li key={item.key} className="bar-row-wrap">
            {onSelect ? (
              <button type="button" className={clsx("bar-row", showRank && "has-rank")} onClick={() => onSelect(item)}
                aria-label={`${item.code ? `${item.code} ` : ""}${item.label}: ${item.value} ${unit}. Ver pacientes`}>
                {body}
              </button>
            ) : (
              <div className={clsx("bar-row", showRank && "has-rank")}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
