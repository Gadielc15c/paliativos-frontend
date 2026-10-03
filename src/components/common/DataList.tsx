import type { KeyboardEvent, ReactNode } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { useIsCompact } from "./useMediaQuery";
import "./DataList.css";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end";
  width?: string;
  /** Tabular numbers / codes (CIE-10, IDs). */
  numeric?: boolean;
}

export interface DataListProps<T> {
  rows: T[];
  rowKey: (row: T) => string;
  /** Desktop table columns. */
  columns: DataColumn<T>[];
  /** Card primary line (Headline). */
  title: (row: T) => ReactNode;
  /** Card secondary line: 1–2 key facts (Subheadline, secondary color). */
  subtitle?: (row: T) => ReactNode;
  /** Optional third line (e.g. an amount) on cards. */
  detail?: (row: T) => ReactNode;
  /** Status / role pill, top-right on cards. */
  status?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  /** First action is the row's primary action; the rest go to an overflow menu. */
  actions?: (row: T) => MenuAction[];
  label: string;
  /** "auto": table on desktop, cards on phones. "cards": cards always (narrow master lists). */
  layout?: "auto" | "cards";
  className?: string;
}

/**
 * One component, two presentations: a calm table where comparing rows is the
 * task (desktop) and an iOS grouped list of cards on phones.
 */
export default function DataList<T>({
  rows, rowKey, columns, title, subtitle, detail, status, onRowClick, selectedKey,
  actions, label, layout = "auto", className,
}: DataListProps<T>) {
  const isCompact = useIsCompact();
  const asCards = layout === "cards" || isCompact;

  if (asCards) {
    return (
      <ul className={clsx("dl-cards", className)} aria-label={label}>
        {rows.map((row) => {
          const key = rowKey(row);
          const rowActions = actions?.(row) ?? [];
          const [primary, ...rest] = rowActions;
          const body = (
            <>
              <span className="dl-card-head">
                <span className="dl-card-title">{title(row)}</span>
                {status && <span className="dl-card-status">{status(row)}</span>}
              </span>
              {subtitle && <span className="dl-card-subtitle">{subtitle(row)}</span>}
              {detail && <span className="dl-card-detail">{detail(row)}</span>}
            </>
          );
          return (
            <li key={key} className={clsx("dl-card", selectedKey === key && "is-selected")}>
              {onRowClick ? (
                <button type="button" className="dl-card-main" onClick={() => onRowClick(row)}
                  aria-current={selectedKey === key || undefined}>
                  <span className="dl-card-copy">{body}</span>
                  <ChevronRight className="dl-card-chevron" size={18} aria-hidden="true" />
                </button>
              ) : (
                <div className="dl-card-main"><span className="dl-card-copy">{body}</span></div>
              )}
              {primary && !onRowClick && (
                <div className="dl-card-actions">
                  <button type="button" className="dl-action" onClick={primary.onClick}
                    disabled={primary.disabled} title={primary.title}>
                    {primary.icon}{primary.label}
                  </button>
                  <ActionMenu actions={rest} />
                </div>
              )}
              {onRowClick && rowActions.length > 0 && (
                <div className="dl-card-actions">
                  <ActionMenu actions={rowActions} text="Acciones" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (onRowClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(row); }
  };

  return (
    <div className={clsx("dl-table-wrap", className)}>
      <table className="data-table dl-table" aria-label={label}>
        <colgroup>
          {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
          {actions && <col style={{ width: "1%" }} />}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx(c.align === "end" && "is-end")}>{c.header}</th>
            ))}
            {actions && <th scope="col" className="is-end"><span className="sr-only">Acciones</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const rowActions = actions?.(row) ?? [];
            const [primary, ...rest] = rowActions;
            return (
              <tr key={key}
                className={clsx(onRowClick && "is-clickable", selectedKey === key && "is-selected")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-selected={onRowClick ? selectedKey === key : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={clsx(c.align === "end" && "is-end", c.numeric && "is-numeric")}>{c.cell(row)}</td>
                ))}
                {actions && (
                  <td className="is-end">
                    <div className="dl-row-actions" onClick={(e) => e.stopPropagation()}>
                      {primary && (
                        <button type="button" className="dl-action" onClick={primary.onClick}
                          disabled={primary.disabled} title={primary.title}>
                          {primary.icon}{primary.label}
                        </button>
                      )}
                      <ActionMenu actions={rest} />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
