"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { downloadCsv } from "@/lib/analytics";
import { EmptyState } from "@/components/ui/empty-state";

export type Column<T> = { key: string; label: string; render: (row: T) => ReactNode; sort?: (row: T) => string | number; csv?: (row: T) => string | number };
export function DataTable<T extends { id: string }>({ title, description, rows, columns, searchText, action, toolbar, exportName, pageSize = 10, emptyTitle = "Nothing here yet", emptyDescription = "Records will appear here as activity comes in." }: { title?: string; description?: string; rows: T[]; columns: Column<T>[]; searchText?: (row: T) => string; action?: ReactNode; toolbar?: ReactNode; exportName?: string; pageSize?: number; emptyTitle?: string; emptyDescription?: string }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const list = rows.filter((row) => !query || (searchText ? searchText(row) : JSON.stringify(row)).toLowerCase().includes(query.toLowerCase()));
    const column = columns.find((item) => item.key === sortKey);
    if (column?.sort) list.sort((a, b) => { const first = column.sort!(a), second = column.sort!(b); return (typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second))) * (direction === "asc" ? 1 : -1); });
    return list;
  }, [rows, query, searchText, columns, sortKey, direction]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  function sort(key: string) { if (sortKey === key) setDirection(direction === "asc" ? "desc" : "asc"); else { setSortKey(key); setDirection("asc"); } setPage(1); }
  return <div className="data-panel"><div className="data-panel-heading"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}</div><div className="table-toolbar"><div className="table-search"><Search size={17} /><input aria-label="Search records" placeholder="Search records..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></div>{toolbar}{exportName && <button type="button" className="tool-button" onClick={() => downloadCsv(exportName, columns.map((c) => c.label), filtered.map((row) => columns.map((c) => c.csv?.(row) ?? c.sort?.(row) ?? "")))}><Download size={15} /> Export CSV</button>}</div>{shown.length ? <><div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.sort ? <button onClick={() => sort(column.key)} type="button">{column.label}{sortKey === column.key ? direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}</button> : column.label}</th>)}</tr></thead><tbody>{shown.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render(row)}</td>)}</tr>)}</tbody></table></div><div className="table-footer"><span>Showing {(Math.min(page, pages) - 1) * pageSize + 1}–{Math.min(page, pages) * pageSize > filtered.length ? filtered.length : Math.min(page, pages) * pageSize} of {filtered.length}</span><div><button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={17} /></button><span>{Math.min(page, pages)} / {pages}</span><button type="button" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page >= pages} aria-label="Next page"><ChevronRight size={17} /></button></div></div></> : <EmptyState title={emptyTitle} description={query ? "Try a different search or clear your filters." : emptyDescription} />}</div>;
}
