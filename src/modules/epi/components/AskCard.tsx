import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, ChevronDown, Info } from "lucide-react";
import AiPill from "../../../components/clinical/AiPill";
import InlineState from "../../../components/clinical/InlineState";
import DataList from "../../../components/common/DataList";
import Pill from "../../../components/common/Pill";
import { aiEndpoints } from "../../../services/endpoints";
import type { AiEpiAnswer, EpiBreakdownItem, EpiTrendSeries } from "../../../types/clinical";
import type { ApiError } from "../../../types/common";
import BarList from "./BarList";
import Pyramid from "./Pyramid";
import TrendChart from "./TrendChart";
import ChartLegend from "./ChartLegend";
import { fmt } from "./format";
import InsightCategoryCard from "./InsightCategoryCard";
import Change from "./Change";

export const SUGGESTED_QUESTIONS = [
  "¿Cuáles son los 5 diagnósticos más frecuentes del último mes en mujeres?",
  "¿Qué diagnósticos aumentaron este mes?",
  "¿Cómo evoluciona el dolor por mes este año?",
  "¿Cuántas consultas hubo en el último trimestre?",
  "Distribución por grupo de edad del último trimestre",
];

const COLUMN_LABELS: Record<string, string> = {
  rank: "#", code: "Código", description: "Descripción", count: "Diagnósticos", patients: "Pacientes", share_pct: "% del total",
  previous_count: "Período anterior", delta: "Cambio", delta_pct: "Cambio %", label: "Grupo", diagnoses: "Diagnósticos",
  consultations: "Consultas", metric: "Métrica", value: "Valor", previous: "Anterior", series: "Serie", bucket: "Período", key: "Clave",
  sex: "Sexo", age_group: "Edad", category: "Categoría", title: "Hallazgo", codes: "Códigos",
};
const HIDDEN = new Set(["key", "metric", "series"]);

function AnswerChart({ a, onOpenCode }: { a: AiEpiAnswer; onOpenCode?: (code: string, description: string) => void }) {
  if (a.categories?.length) {
    return (
      <div className="ins-grid">
        {a.categories.map((c) => <InsightCategoryCard key={c.category_key} category={c} onCode={(code, d) => onOpenCode?.(code, d)} />)}
      </div>
    );
  }
  const rows = a.data;
  if (!rows.length) return null;
  switch (a.chart_hint.type) {
    case "kpi":
      return (
        <div className="epi-kpis is-mini">
          {rows.map((r) => (
            <div key={String(r.metric)} className="epi-kpi">
              <span className="epi-kpi-label">{String(r.label)}</span>
              <span className="epi-kpi-value">{fmt(Number(r.value))}</span>
              <span className="epi-kpi-foot">
                <Change current={Number(r.value)} previous={Number(r.previous)} pct={r.delta_pct as number | null} withValue={false} />
              </span>
            </div>
          ))}
        </div>
      );
    case "line": {
      const keys = [...new Set(rows.map((r) => String(r.series)))];
      const buckets = [...new Set(rows.map((r) => String(r.bucket)))];
      const series: EpiTrendSeries[] = keys.map((k) => {
        const pts = rows.filter((r) => String(r.series) === k);
        return { key: k, label: String(pts[0]?.label ?? k), total: pts.reduce((s, r) => s + Number(r.value), 0), points: pts.map((r) => ({ bucket: String(r.bucket), value: Number(r.value) })) };
      });
      return (
        <>
          {series.length > 1 && <ChartLegend items={series.map((s) => s.label)} />}
          <TrendChart buckets={buckets} series={series} height={220} />
        </>
      );
    }
    case "pyramid":
      return <Pyramid items={rows as unknown as EpiBreakdownItem[]} />;
    default: {
      const isTop = a.intent === "top_diagnoses";
      return (
        <BarList label="Resultado" showRank={isTop}
          items={rows.map((r) => ({
            key: String(r.code ?? r.key ?? r.label), code: isTop ? String(r.code) : undefined,
            label: String(isTop ? r.description : r.label), value: Number(r.count ?? r.diagnoses ?? r.value ?? 0),
            meta: r.share_pct !== undefined ? `${String(r.share_pct).replace(".", ",")}% del total` : undefined,
          }))} />
      );
    }
  }
}

function cell(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return v.toLocaleString("es-DO");
  return String(v);
}

function Answer({ a, onOpenCode }: { a: AiEpiAnswer; onOpenCode?: (code: string, description: string) => void }) {
  const cols = Object.keys(a.data[0] ?? {}).filter((k) => !HIDDEN.has(k));
  const titleKey = cols.includes("description") ? "description" : cols.includes("title") ? "title" : cols.includes("label") ? "label" : cols[0];
  const intentLabel = { summary: "Resumen", top_diagnoses: "Más frecuentes", trend: "Tendencia", breakdown: "Distribución", insights: "Hallazgos por categoría" }[a.intent];
  return (
    <article className="epi-answer">
      <p className="epi-answer-question">{a.question}</p>
      <p className={a.categories?.length ? "epi-answer-text is-lead" : "epi-answer-text"}>{a.answer}</p>
      <div className={a.categories?.length ? "epi-answer-cards" : "epi-answer-chart"}><AnswerChart a={a} onOpenCode={onOpenCode} /></div>
      <div className="epi-answer-meta">
        <Pill tone="neutral">{`${a.period.date_from} → ${a.period.date_to}`}</Pill>
        <Pill tone="neutral">{intentLabel}</Pill>
        {a.fallback && <Pill tone="warning">Respuesta sin modelo remoto</Pill>}
      </div>
      {a.data.length > 0 && (
        <details className="epi-disclosure">
          <summary><ChevronDown size={18} aria-hidden="true" />Ver datos utilizados <span className="epi-disclosure-count">{a.data.length} filas</span></summary>
          <DataList<Record<string, unknown>>
            label="Datos utilizados"
            rows={a.data}
            rowKey={(r) => JSON.stringify(r)}
            columns={cols.map((k) => {
              const numeric = typeof a.data[0][k] === "number";
              return { key: k, header: COLUMN_LABELS[k] ?? k, cell: (r: Record<string, unknown>) => cell(r[k]), numeric, align: numeric ? ("end" as const) : undefined };
            })}
            title={(r) => cell(r[titleKey])}
            subtitle={(r) => cols.filter((k) => k !== titleKey).slice(0, 4).map((k) => `${COLUMN_LABELS[k] ?? k}: ${cell(r[k])}`).join(" · ")}
          />
        </details>
      )}
      <p className="ai-disclaimer"><Info size={14} aria-hidden="true" />{a.disclaimer_text}</p>
    </article>
  );
}

export default function AskCard({ inputRef, initialQuestion, onOpenCode }: { inputRef?: RefObject<HTMLInputElement>; initialQuestion?: string; onOpenCode?: (code: string, description: string) => void }) {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<AiEpiAnswer[]>([]);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const ask = useMutation({
    mutationFn: (q: string) => aiEndpoints.ask(q),
    onSuccess: (a) => { setAnswers((prev) => [a, ...prev].slice(0, 5)); setQuestion(""); },
  });
  const submit = (e?: FormEvent, q = question) => {
    e?.preventDefault();
    const text = q.trim();
    if (text.length < 3 || ask.isPending) return;
    setQuestion(text);
    ask.mutate(text);
  };

  // Deep link: /epidemiologia?ask=… asks on arrival.
  const asked = useRef(false);
  useEffect(() => { if (initialQuestion && !asked.current) { asked.current = true; submit(undefined, initialQuestion); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="data-card epi-ask" aria-labelledby="epi-ask-title">
      <div className="data-card-header">
        <div className="epi-ask-heading">
          <h2 id="epi-ask-title" className="data-card-title epi-ask-title">Pregúntale a tus datos <AiPill /></h2>
          <p className="data-card-subtitle">Escribe una pregunta en lenguaje natural. La IA elige la consulta; los números salen de tu base de datos.</p>
        </div>
      </div>
      <div className="data-card-body epi-ask-body">
        <form className="epi-ask-form" onSubmit={submit}>
          <label className="search-field glow-border glow-focus epi-ask-field">
            <span className="sr-only">Pregunta</span>
            <input ref={ref} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} enterKeyHint="send"
              placeholder="p. ej. ¿Qué diagnósticos aumentaron este mes?" disabled={ask.isPending} />
          </label>
          <button type="submit" className="epi-ask-send" aria-label="Preguntar" disabled={question.trim().length < 3 || ask.isPending}>
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        </form>
        <div className="epi-suggestions" aria-label="Preguntas sugeridas">
          {SUGGESTED_QUESTIONS.map((q) => (
            <Pill key={q} selected={false} onClick={() => submit(undefined, q)} disabled={ask.isPending}>{q}</Pill>
          ))}
        </div>
        {ask.isPending && (
          <div className="epi-answer is-loading" aria-live="polite">
            <p className="epi-answer-question">{question}</p>
            <div className="ai-shimmer"><span /><span /><span /></div>
          </div>
        )}
        {ask.isError && <InlineState kind="error" message={(ask.error as unknown as ApiError)?.message || "No se pudo responder la pregunta."} onRetry={() => submit()} />}
        {answers.map((a) => <Answer key={a.suggestion_id} a={a} onOpenCode={onOpenCode} />)}
      </div>
    </section>
  );
}
