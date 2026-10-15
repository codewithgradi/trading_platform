"use client";

import { Download } from "lucide-react";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { formatDate, toCsv } from "@/lib/utils";

export type AuditRowView = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorName: string | null;
  before: string | null;
  after: string | null;
  createdAt: string;
};

export function AuditTable({ rows }: { rows: AuditRowView[] }) {
  const columns: Column<AuditRowView>[] = [
    {
      key: "createdAt",
      header: "When",
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="whitespace-nowrap text-[12.5px] text-ink-2">{formatDate(row.createdAt, true)}</span>
      ),
    },
    {
      key: "actorName",
      header: "Actor",
      sortValue: (row) => row.actorName ?? "",
      render: (row) => <span className="text-[13px] font-medium text-ink">{row.actorName ?? "System"}</span>,
    },
    {
      key: "action",
      header: "Action",
      sortValue: (row) => row.action,
      render: (row) => (
        <Badge tone={row.action.startsWith("balance") ? "positive" : row.action.includes("delete") ? "negative" : "neutral"}>
          {row.action}
        </Badge>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-[12.5px] text-ink-2">
          {row.entity}
          {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}
        </span>
      ),
    },
    {
      key: "before",
      header: "Before",
      hideOnMobile: true,
      render: (row) => (
        <span className="tnum line-clamp-1 max-w-[16rem] text-[12px] text-ink-3">{row.before ?? "—"}</span>
      ),
    },
    {
      key: "after",
      header: "After",
      hideOnMobile: true,
      render: (row) => (
        <span className="tnum line-clamp-1 max-w-[16rem] text-[12px] text-ink-3">{row.after ?? "—"}</span>
      ),
    },
  ];

  const exportCsv = () => {
    const csv = toCsv(
      rows.map((row) => ({
        timestamp: row.createdAt,
        actor: row.actorName ?? "System",
        action: row.action,
        entity: row.entity,
        entity_id: row.entityId ?? "",
        before: row.before ?? "",
        after: row.after ?? "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meridian-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <DataTable
        rows={rows}
        columns={columns}
        pageSize={15}
        searchKeys={(row) => `${row.action} ${row.entity} ${row.actorName ?? ""} ${row.before ?? ""} ${row.after ?? ""}`}
        searchPlaceholder="Search actions, actors, entities…"
        emptyTitle="No audit events"
        toolbar={
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            Export CSV
          </Button>
        }
      />
    </Card>
  );
}
