const nf = new Intl.NumberFormat("es-DO");
export const fmt = (n: number) => nf.format(n);
export const fmtDec = (n: number, d = 1) => n.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: d });
export const fmtPctValue = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${fmtDec(n)} %`);
export const fmtUsd = (n: number) => `US$${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 })}`;

/**
 * Delta wording. Small counts never get a percentage: "9 (antes 1)" reads honestly,
 * "+800 %" on tiny numbers is alarming and misleading.
 */
export function deltaText(value: number, previous: number, pct: number | null): { text: string; dir: "up" | "down" | "flat" } {
  const dir = value > previous ? "up" : value < previous ? "down" : "flat";
  if (previous < 5 || value < 5 || pct === null) return { text: dir === "flat" ? "Igual que antes" : `antes ${fmt(previous)}`, dir };
  return { text: `${pct > 0 ? "+" : ""}${fmtDec(pct)} %`, dir };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
/** 2026-03 → "mar 2026"; 2026-03-09 → "9 mar". */
export function bucketLabel(bucket: string) {
  const [y, m, d] = bucket.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  return d ? `${Number(d)} ${month}` : `${month} ${y}`;
}

export const shortDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });

export function relativeDays(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((a - b) / 864e5);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  return `hace ${diff} días`;
}
