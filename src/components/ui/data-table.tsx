"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { EmptyState, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  hideOnMobile?: boolean;
  primary?: boolean;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  searchPlaceholder = "Search…",
  pageSize = 10,
  toolbar,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = React.useMemo(() => {
    const base = !query.trim() || !searchKeys
      ? rows
      : rows.filter((row) => searchKeys(row).toLowerCase().includes(query.trim().toLowerCase()));
    if (!sort) return base;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return base;
    return [...base].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sort.dir === "asc" ? result : -result;
    });
  }, [rows, query, searchKeys, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div>
      {(searchKeys || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {searchKeys ? (
            <div className="relative sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                strokeWidth={1.8}
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="h-10 pl-9"
                aria-label={searchPlaceholder}
              />
            </div>
          ) : (
            <span />
          )}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3",
                        column.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSort((prev) =>
                              prev?.key === column.key
                                ? { key: column.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                                : { key: column.key, dir: "asc" },
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-ink",
                            column.align === "right" && "flex-row-reverse",
                          )}
                        >
                          {column.header}
                          {sort?.key === column.key ? (
                            sort.dir === "asc" ? (
                              <ArrowUp className="h-3 w-3" strokeWidth={2} />
                            ) : (
                              <ArrowDown className="h-3 w-3" strokeWidth={2} />
                            )
                          ) : null}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {visible.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        "border-b border-line last:border-0 transition-colors",
                        onRowClick && "cursor-pointer hover:bg-surface",
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-3 align-middle text-ink-2",
                            column.align === "right" && "text-right",
                          )}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <ul className="divide-y divide-[var(--border)] md:hidden">
            {visible.map((row) => (
              <li
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("space-y-2 px-4 py-3.5", onRowClick && "active:bg-surface")}
              >
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        {column.header}
                      </span>
                      <span className="min-w-0 text-right text-[13px] text-ink-2">{column.render(row)}</span>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </>
      )}

      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[12px] text-ink-3">
            Showing <span className="tnum">{current * pageSize + 1}</span>–
            <span className="tnum">{Math.min((current + 1) * pageSize, filtered.length)}</span> of{" "}
            <span className="tnum">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={current === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:bg-surface disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:bg-surface disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
