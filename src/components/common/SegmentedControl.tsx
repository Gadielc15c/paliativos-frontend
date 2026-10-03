import { useId, type KeyboardEvent } from "react";
import clsx from "clsx";

export interface Segment<V extends string> {
  value: V;
  label: string;
  /** Shorter label used on phones (≤480px) when the full one would not fit. */
  short?: string;
  badge?: number;
}

interface SegmentedControlProps<V extends string> {
  segments: Segment<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
}

/** iOS segmented control with roving focus; used as tabs for long screens. */
export default function SegmentedControl<V extends string>({ segments, value, onChange, label, className }: SegmentedControlProps<V>) {
  const id = useId();
  const index = Math.max(0, segments.findIndex((s) => s.value === value));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = segments[(index + delta + segments.length) % segments.length];
    onChange(next.value);
    document.getElementById(`${id}-${next.value}`)?.focus();
  };

  return (
    <div
      className={clsx("segmented", className)}
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
      style={{ "--seg-count": segments.length, "--seg-index": index } as React.CSSProperties}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {segments.map((s) => (
        <button
          key={s.value}
          id={`${id}-${s.value}`}
          type="button"
          role="tab"
          aria-selected={s.value === value}
          aria-label={s.short ? s.label : undefined}
          tabIndex={s.value === value ? 0 : -1}
          className="segmented-item"
          onClick={() => onChange(s.value)}
        >
          {s.short ? (
            <><span className="segmented-label seg-full">{s.label}</span><span className="segmented-label seg-short" aria-hidden="true">{s.short}</span></>
          ) : <span className="segmented-label">{s.label}</span>}
          {typeof s.badge === "number" && s.badge > 0 && <span className="segmented-badge">{s.badge}</span>}
        </button>
      ))}
    </div>
  );
}
