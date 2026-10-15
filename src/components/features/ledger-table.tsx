"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, Card, Select, statusTone } from "@/components/ui/primitives";
import { formatCurrency, formatDate, formatSigned, toCsv, transactionLabel } from "@/lib/utils";

export type LedgerRow = {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string | null;
  status: string;
  reference: string | null;
  createdAt: string;
  clientName?: string;
};

export function LedgerTable({
  rows,
  currency = "USD",
  showClient = false,
  title = "Transaction ledger",
}: {
  rows: LedgerRow[];
  currency?: string;
  showClient?: boolean;
  title?: string;
}) {
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [period, setPeriod] = React.useState("all");

  const filtered = React.useMemo(() => {
    const cutoff =
      period === "all" ? 0 : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    return rows.filter((row) => {
      if (type !== "all" && row.type !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      if (cutoff && new Date(row.createdAt).getTime() < cutoff) return false;
      return true;
    });
  }, [rows, type, status, period]);

  const exportCsv = () => {
    const csv = toCsv(
      filtered.map((row) => ({
        date: new Date(row.createdAt).toISOString(),
        ...(showClient ? { client: row.clientName ?? "" } : {}),
        type: transactionLabel[row.type] ?? row.type,
        amount: row.amount.toFixed(2),
        balance_before: row.balanceBefore.toFixed(2),
        balance_after: row.balanceAfter.toFixed(2),
        status: row.status,
        reference: row.reference ?? "",
        note: row.note ?? "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meridian-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<LedgerRow>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-ink-2">{formatDate(row.createdAt, true)}</span>
      ),
    },
    ...(showClient
      ? [
          {
            key: "client",
            header: "Client",
            sortValue: (row: LedgerRow) => row.clientName ?? "",
            render: (row: LedgerRow) => (
              <span className="text-[13px] font-medium text-ink">{row.clientName}</span>
            ),
          } as Column<LedgerRow>,
        ]
      : []),
    {
      key: "type",
      header: "Type",
      sortValue: (row) => row.type,
      render: (row) => (
        <span className="text-[13px] font-medium text-ink">{transactionLabel[row.type] ?? row.type}</span>
      ),
    },
    {
      key: "note",
      header: "Detail",
      hideOnMobile: true,
      render: (row) => (
        <span className="line-clamp-1 max-w-[22rem] text-[13px] text-ink-2">{row.note ?? "—"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (row) => row.amount,
      render: (row) => (
        <span
          className={`tnum text-[13px] font-semibold ${
            row.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }`}
        >
          {formatSigned(row.amount, currency)}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Balance after",
      align: "right",
      sortValue: (row) => row.balanceAfter,
      render: (row) => (
        <span className="tnum text-[13px] text-ink-2">{formatCurrency(row.balanceAfter, currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {filtered.length} of {rows.length} entries · balance before and after on every row
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 border-b border-line px-5 py-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Type</span>
          <Select value={type} onChange={(event) => setType(event.target.value)} className="h-10">
            <option value="all">All types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="trade_outcome">Trade outcomes</option>
            <option value="adjustment">Adjustments</option>
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wide text-ink-3">
            Status
          </span>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10">
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="reversed">Reversed</option>
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wide text-ink-3">
            Period
          </span>
          <Select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10">
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        </label>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        pageSize={12}
        searchKeys={(row) => `${row.note ?? ""} ${row.reference ?? ""} ${row.clientName ?? ""} ${row.type}`}
        searchPlaceholder="Search notes, references…"
        emptyTitle="No matching transactions"
        emptyDescription="Try widening the filters or clearing your search."
      />
    </Card>
  );
}
