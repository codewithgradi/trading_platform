"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, Card, statusTone } from "@/components/ui/primitives";
import { formatCurrency, formatPercent, timeAgo, toCsv } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  balance: number;
  currency: string;
  deposited: number;
  withdrawn: number;
  change30: number;
  lastActivity: string;
};

export function CustomersTable({ rows, basePath = "/trader/customers" }: { rows: CustomerRow[]; basePath?: string }) {
  const router = useRouter();

  const columns: Column<CustomerRow>[] = [
    {
      key: "fullName",
      header: "Client",
      sortValue: (row) => row.fullName,
      render: (row) => (
        <span className="block">
          <span className="block text-[13.5px] font-medium text-ink">{row.fullName}</span>
          <span className="block text-[11.5px] text-ink-3">{row.email}</span>
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortValue: (row) => row.balance,
      render: (row) => (
        <span className="tnum text-[13.5px] font-semibold text-ink">
          {formatCurrency(row.balance, row.currency)}
        </span>
      ),
    },
    {
      key: "change30",
      header: "30d change",
      align: "right",
      sortValue: (row) => row.change30,
      render: (row) => (
        <Badge tone={row.change30 >= 0 ? "positive" : "negative"}>{formatPercent(row.change30)}</Badge>
      ),
    },
    {
      key: "deposited",
      header: "Deposited",
      align: "right",
      hideOnMobile: true,
      sortValue: (row) => row.deposited,
      render: (row) => (
        <span className="tnum text-[13px] text-ink-2">{formatCurrency(row.deposited, row.currency)}</span>
      ),
    },
    {
      key: "withdrawn",
      header: "Withdrawn",
      align: "right",
      hideOnMobile: true,
      sortValue: (row) => row.withdrawn,
      render: (row) => (
        <span className="tnum text-[13px] text-ink-2">{formatCurrency(row.withdrawn, row.currency)}</span>
      ),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      align: "right",
      sortValue: (row) => new Date(row.lastActivity).getTime(),
      render: (row) => <span className="text-[12.5px] text-ink-3">{timeAgo(row.lastActivity)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
  ];

  const exportCsv = () => {
    const csv = toCsv(
      rows.map((row) => ({
        client: row.fullName,
        email: row.email,
        balance: row.balance.toFixed(2),
        deposited: row.deposited.toFixed(2),
        withdrawn: row.withdrawn.toFixed(2),
        change_30d_pct: row.change30.toFixed(2),
        status: row.status,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meridian-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <DataTable
        rows={rows}
        columns={columns}
        pageSize={10}
        onRowClick={(row) => router.push(`${basePath}/${row.id}`)}
        searchKeys={(row) => `${row.fullName} ${row.email}`}
        searchPlaceholder="Search clients by name or email…"
        emptyTitle="No clients assigned"
        emptyDescription="When an administrator assigns clients to you, they will appear here."
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
