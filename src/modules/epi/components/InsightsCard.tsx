import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import Button from "../../../components/common/Button";
import { useIsCompact } from "../../../components/common/useMediaQuery";
import AiPill from "../../../components/clinical/AiPill";
import InlineState from "../../../components/clinical/InlineState";
import { aiEndpoints } from "../../../services/endpoints";
import type { EpiInsightCategory } from "../../../types/clinical";
import InsightCategoryCard from "./InsightCategoryCard";
import { dateLabel } from "./format";
import type { EpiQueryFilters } from "./useEpiFilters";

/** Insights are computed without the category/chapter/code filters so every category keeps its own card. */
export const insightsBase = (filters: EpiQueryFilters): EpiQueryFilters => ({ ...filters, chapter: undefined, code: undefined, category: undefined });

export function useEpiInsights(filters: EpiQueryFilters) {
  const base = insightsBase(filters);
  return useQuery({ queryKey: ["epi-insights", base], queryFn: () => aiEndpoints.insights(base), staleTime: 5 * 60 * 1000, retry: 1 });
}

interface Props {
  filters: EpiQueryFilters;
  /** Selected category key (URL ?cat=). */
  activeKey: string | null;
  onCategory: (c: EpiInsightCategory | null) => void;
  onOpenCode: (code: string, description: string) => void;
}

/** Findings grouped by disease category: one finding per card, the rest behind "Ver más". */
export default function InsightsCard({ filters, activeKey, onCategory, onOpenCode }: Props) {
  const { data, isLoading, isError, refetch } = useEpiInsights(filters);
  const cats = (data?.categories ?? []).filter((c) => c.total_cases > 0 || c.insights.length > 0);
  const compact = useIsCompact();
  const [expanded, setExpanded] = useState(false);
  const filtered = activeKey ? cats.filter((c) => c.category_key === activeKey) : cats;
  const limit = expanded ? Infinity : compact ? 3 : 6;
  const shown = filtered.slice(0, limit);

  return (
    <section className="data-card epi-insights" aria-labelledby="epi-insights-title">
      <div className="data-card-header epi-insights-head">
        <div>
          <h2 id="epi-insights-title" className="data-card-title epi-ask-title">Hallazgos por categoría <AiPill /></h2>
          <p className="data-card-subtitle">
            {data ? `Lo más importante de cada grupo de enfermedades · ${dateLabel(data.period.date_from)} – ${dateLabel(data.period.date_to)}` : "Lo más importante de cada grupo de enfermedades"}
          </p>
        </div>
      </div>
      <div className="data-card-body epi-insights-body">
        {isLoading ? (
          <div className="ins-grid">{[0, 1, 2].map((i) => <div key={i} className="ins-card is-loading"><div className="ai-shimmer"><span /><span /><span /></div></div>)}</div>
        ) : isError ? (
          <InlineState kind="error" message="No se pudieron calcular los hallazgos." onRetry={() => void refetch()} />
        ) : !shown.length ? (
          <InlineState message="Sin diagnósticos codificados en este período. Amplía el período o registra diagnósticos CIE-10 en las consultas." />
        ) : (
          <div className="ins-grid">
            {shown.map((c) => (
              <InsightCategoryCard key={c.category_key} category={c} active={activeKey === c.category_key}
                onFilter={(x) => onCategory(activeKey === x.category_key ? null : x)} onCode={onOpenCode} />
            ))}
          </div>
        )}
        {filtered.length > shown.length && (
          <Button variant="gray" className="epi-more-btn" onClick={() => setExpanded(true)}>{`Ver las ${filtered.length} categorías`}</Button>
        )}
        {data && <p className="ai-disclaimer"><Info size={14} aria-hidden="true" />{data.disclaimer}</p>}
      </div>
    </section>
  );
}
