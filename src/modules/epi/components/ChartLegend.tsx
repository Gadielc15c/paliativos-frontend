/** Legend for ≥ 2 series: swatch beside text-ink label (text never wears the series color). */
export default function ChartLegend({ items, colors }: { items: string[]; colors?: string[] }) {
  return (
    <ul className="chart-legend" aria-label="Leyenda">
      {items.map((label, i) => (
        <li key={label}>
          <i className="swatch" style={{ background: colors?.[i] ?? `var(--series-${(i % 4) + 1})` }} />
          <span title={label}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
