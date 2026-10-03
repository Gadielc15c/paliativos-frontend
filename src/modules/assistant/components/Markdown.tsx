import { Fragment, memo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useIsCompact } from "../../../components/common/useMediaQuery";

/**
 * Tiny, safe Markdown → React renderer for assistant replies. Supports paragraphs, line breaks,
 * **bold**, _italic_, `code`, [links](/internal or https://…), bullet / numbered lists, short
 * pipe tables and ### headings. Never produces raw HTML: everything is a React text node.
 */
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(_[^_\n]+_)|(\*[^*\n]+\*)/g;

function safeHref(url: string): { internal: boolean; href: string } | null {
  if (url.startsWith("/") && !url.startsWith("//")) return { internal: true, href: url };
  if (/^https?:\/\//i.test(url)) return { internal: false, href: url };
  return null; // javascript:, data:, mailto… are dropped (text only)
}

function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k} className="md-code">{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(tok.slice(2, -2), k)}</strong>);
    else if (m[3]) {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) ?? [];
      const target = url ? safeHref(url) : null;
      if (!target) out.push(label ?? tok);
      else if (target.internal) out.push(<Link key={k} to={target.href} className="md-link">{inline(label, k)}</Link>);
      else out.push(<a key={k} href={target.href} target="_blank" rel="noopener noreferrer" className="md-link">{inline(label, k)}</a>);
    } else out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const withBreaks = (lines: string[], key: string) =>
  lines.map((l, i) => <Fragment key={`${key}-${i}`}>{i > 0 && <br />}{inline(l, `${key}-${i}`)}</Fragment>);

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/** Phones never get <table>: rows become label/value cards. */
function MdTable({ id, head, rows }: { id: string; head: string[]; rows: string[][] }) {
  const compact = useIsCompact();
  if (compact) {
    return (
      <ul className="md-cards">
        {rows.map((r, ri) => (
          <li key={ri} className="md-card">
            <strong>{inline(r[0] ?? "", `${id}r${ri}c0`)}</strong>
            {head.slice(1).map((h, j) => <span key={j}><span className="md-card-label">{h}:</span> {inline(r[j + 1] ?? "", `${id}r${ri}c${j + 1}`)}</span>)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead><tr>{head.map((h, j) => <th key={j} scope="col">{inline(h, `${id}h${j}`)}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri}>{head.map((_, j) => <td key={j}>{inline(r[j] ?? "", `${id}r${ri}c${j}`)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${b++}`;
    if (!line.trim()) { i++; continue; }
    // Table: header row + separator row.
    if (line.trim().startsWith("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      blocks.push(<MdTable key={key} id={key} head={head} rows={rows} />);
      continue;
    }
    const ul = /^\s*[-*•]\s+(.*)$/;
    const ol = /^\s*(\d+)[.)]\s+(.*)$/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = !ul.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? ol : ul).test(lines[i])) {
        const m = (ordered ? ol : ul).exec(lines[i])!;
        items.push(ordered ? m[2] : m[1]);
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(<Tag key={key} className="md-list">{items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</Tag>);
      continue;
    }
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) { blocks.push(<p key={key} className="md-heading">{inline(h[1], key)}</p>); i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !ul.test(lines[i]) && !ol.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])
      && !(lines[i].trim().startsWith("|") && i + 1 < lines.length && isSep(lines[i + 1]))) para.push(lines[i++]);
    blocks.push(<p key={key}>{withBreaks(para, key)}</p>);
  }
  return <div className="md">{blocks}</div>;
}

export default memo(Markdown);
