const nf = new Intl.NumberFormat("es-DO");
export const fmt = (n: number) => nf.format(n);
export const fmtPct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("es-DO", { maximumFractionDigits: 1 })}%`);
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
/** Bucket labels: 2026-03 → "mar 2026", 2026-03-09 → "9 mar". */
export function bucketLabel(bucket: string, short = false) {
  const [y, m, d] = bucket.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  if (!d) return short ? month : `${month} ${y}`;
  return `${Number(d)} ${month}`;
}
export function dateLabel(isoDate: string) {
  const d = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

/** Below this, a % change is noise ("+700%" on 1 → 8 cases). Show raw counts instead. */
export const SMALL_N = 5;
export const isSmall = (current: number, previous: number | null | undefined) => current < SMALL_N || (previous ?? 0) < SMALL_N;
/** "9 casos (antes 1)" — the small-numbers form, never a percentage. */
export const casesText = (current: number, previous: number | null | undefined, unit: [string, string] = ["caso", "casos"]) =>
  `${fmt(current)} ${current === 1 ? unit[0] : unit[1]}${previous === null || previous === undefined ? "" : ` (antes ${fmt(previous)})`}`;
export const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const monthShort = (bucket: string) => bucketLabel(bucket, true);
