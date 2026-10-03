import type { EpiBreakdownItem } from "../../../types/clinical";
import { fmt } from "./format";

const GROUPS = ["75+", "60-74", "40-59", "18-39", "0-17"];

/** Age/sex pyramid: women left, men right, one shared scale, oldest on top. */
export default function Pyramid({ items }: { items: EpiBreakdownItem[] }) {
  const value = (g: string, s: string) => items.find((i) => i.age_group === g && i.sex === s)?.diagnoses ?? 0;
  const max = Math.max(1, ...items.map((i) => i.diagnoses));
  const total = (s: string) => items.filter((i) => i.sex === s).reduce((a, i) => a + i.diagnoses, 0);
  const all = Math.max(1, total("female") + total("male"));
  return (
    <figure className="pyramid" aria-label="Pirámide de edad y sexo">
      <div className="pyramid-legend">
        <span><i className="swatch" style={{ background: "var(--chart-female)" }} />Femenino · {Math.round((total("female") / all) * 100)}%</span>
        <span><i className="swatch" style={{ background: "var(--chart-male)" }} />Masculino · {Math.round((total("male") / all) * 100)}%</span>
      </div>
      <div className="pyramid-rows">
        {GROUPS.map((g) => {
          const f = value(g, "female"), m = value(g, "male");
          return (
            <div key={g} className="pyramid-row" title={`${g} años: ${f} femenino, ${m} masculino`}>
              <span className="pyramid-side is-left">
                <span className="pyramid-num">{fmt(f)}</span>
                <span className="pyramid-bar" style={{ width: `${(f / max) * 100}%`, background: "var(--chart-female)" }} />
              </span>
              <span className="pyramid-age">{g}</span>
              <span className="pyramid-side is-right">
                <span className="pyramid-bar" style={{ width: `${(m / max) * 100}%`, background: "var(--chart-male)" }} />
                <span className="pyramid-num">{fmt(m)}</span>
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">Diagnósticos por grupo de edad: {GROUPS.map((g) => `${g}: ${value(g, "female")} mujeres, ${value(g, "male")} hombres`).join("; ")}</figcaption>
    </figure>
  );
}
