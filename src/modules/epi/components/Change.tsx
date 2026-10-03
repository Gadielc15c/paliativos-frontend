import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { casesText, fmt, fmtPct, isSmall } from "./format";

interface ChangeProps {
  current: number;
  previous: number | null | undefined;
  pct: number | null | undefined;
  /** Show the full "9 casos (antes 1)" phrase for small numbers; otherwise "antes 1" only (the big value is next to it). */
  withValue?: boolean;
  unit?: [string, string];
}

/**
 * Change vs the previous period. Small counts (< 5 on either side) never get a percentage:
 * "+700%" on 1 → 8 cases is alarming noise. Neutral tone: more diagnoses is not good or bad by itself.
 */
export default function Change({ current, previous, pct, withValue = true, unit }: ChangeProps) {
  if (previous === null || previous === undefined) return null;
  const dir = current > previous ? "up" : current < previous ? "down" : "flat";
  if (isSmall(current, previous)) {
    return (
      <span className="epi-change is-small" title="Con pocos casos no mostramos porcentajes: cualquier cambio parece enorme.">
        {withValue ? casesText(current, previous, unit) : `antes ${fmt(previous)}`}
      </span>
    );
  }
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <span className="epi-delta" data-dir={dir} title={`Período anterior: ${fmt(previous)}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{pct === null || pct === undefined ? (dir === "up" ? "Nuevo" : "Sin cambio") : fmtPct(pct)}</span>
    </span>
  );
}
