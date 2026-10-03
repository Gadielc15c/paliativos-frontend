import { ChevronRight, Lightbulb } from "lucide-react";
import Button from "../../../components/common/Button";
import InlineState from "../../../components/clinical/InlineState";
import type { EpiInsightCategory, EpiInsightItem } from "../../../types/clinical";
import { SeverityPill } from "./InsightCategoryCard";
import { useEpiInsights } from "./InsightsCard";
import { dateLabel } from "./format";
import { actionFor, METHOD_TEXT, plainLine, rankFindings } from "./plain";
import type { EpiQueryFilters } from "./useEpiFilters";

interface Props {
  filters: EpiQueryFilters;
  onPatients: (code: string, description: string) => void;
  onTrend: (code: string) => void;
  onCategory: (c: EpiInsightCategory) => void;
  onWiden: () => void;
}

/** "Lo importante": the three findings that matter most, one plain line and one action each. */
export default function HighlightsCard({ filters, onPatients, onTrend, onCategory, onWiden }: Props) {
  const { data, isLoading, isError, refetch } = useEpiInsights(filters);
  const cats = (data?.categories ?? []).filter((c) => !filters.category || c.category_key === filters.category);
  const top = rankFindings(cats).slice(0, 3);

  const run = (i: EpiInsightItem, c: EpiInsightCategory) => {
    const a = actionFor(i);
    const code = i.codes[0];
    if (a.kind === "patients" && code) onPatients(code.code, code.description);
    else if (a.kind === "trend" && code) onTrend(code.code);
    else onCategory(c);
  };

  return (
    <section className="data-card epi-highlights" aria-labelledby="epi-highlights-title">
      <div className="data-card-header">
        <div>
          <h2 id="epi-highlights-title" className="data-card-title epi-highlights-title"><Lightbulb size={20} aria-hidden="true" />Lo importante</h2>
          <p className="data-card-subtitle">{data ? `${dateLabel(data.period.date_from)} – ${dateLabel(data.period.date_to)} · ordenado por urgencia` : "Lo que más cambió en tus diagnósticos"}</p>
        </div>
      </div>
      <div className="data-card-body epi-highlights-body">
        {isLoading ? (
          <div className="card-skeleton">{[0, 1, 2].map((k) => <span key={k} className="skeleton" style={{ height: 56 }} />)}</div>
        ) : isError ? (
          <InlineState kind="error" message="No se pudieron calcular los hallazgos." onRetry={() => void refetch()} />
        ) : top.length === 0 ? (
          <InlineState message="No hay cambios importantes en este período: todo está dentro de lo habitual.">
            <Button variant="gray" onClick={onWiden}>Ver los últimos 90 días</Button>
          </InlineState>
        ) : (
          <ol className="epi-highlight-list">
            {top.map(({ i, c }) => {
              const a = actionFor(i);
              return (
                <li key={i.id} className="epi-highlight" data-severity={i.severity}>
                  <SeverityPill severity={i.severity} />
                  <p className="epi-highlight-line">{plainLine(i, c)}</p>
                  <Button variant={i.severity === "info" ? "gray" : "tinted"} size="sm" className="epi-highlight-action" onClick={() => run(i, c)}>
                    <span>{a.label}</span><ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
        <details className="epi-method">
          <summary>¿Cómo se calculó?</summary>
          <ul>{METHOD_TEXT.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
      </div>
    </section>
  );
}
