"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus } from "lucide-react";

import { allocateTradeAction, closeTradeAction, createTradeAction } from "@/app/actions/trader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea, statusTone } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { formatCurrency, formatDate, formatSigned } from "@/lib/utils";

export type TradeRow = {
  id: string;
  instrument: string;
  direction: string;
  size: number;
  entry: number;
  exit: number | null;
  pnl: number;
  status: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
};

export type BookClient = { id: string; name: string; balance: number };

export function TradesManager({ trades, clients }: { trades: TradeRow[]; clients: BookClient[] }) {
  const [state, action, pending] = useActionState(createTradeAction, idleState);
  const [status, setStatus] = React.useState("closed");
  const [allocating, setAllocating] = React.useState<TradeRow | null>(null);
  const [mode, setMode] = React.useState<"proportional" | "manual">("proportional");
  const [manual, setManual] = React.useState<Record<string, string>>({});
  const [allocPending, setAllocPending] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Trade logged", tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not saved", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  const totalBalance = clients.reduce((sum, client) => sum + client.balance, 0);

  const allocations = React.useMemo(() => {
    if (!allocating) return [] as { clientId: string; name: string; amount: number }[];
    return clients.map((client) => {
      const amount =
        mode === "proportional"
          ? totalBalance > 0
            ? Math.round(((allocating.pnl * client.balance) / totalBalance) * 100) / 100
            : 0
          : Number(manual[client.id] ?? 0);
      return { clientId: client.id, name: client.name, amount };
    });
  }, [allocating, clients, mode, manual, totalBalance]);

  const allocatedTotal = allocations.reduce((sum, row) => sum + row.amount, 0);

  const columns: Column<TradeRow>[] = [
    {
      key: "instrument",
      header: "Instrument",
      sortValue: (row) => row.instrument,
      render: (row) => (
        <span className="block">
          <span className="block text-[13.5px] font-medium text-ink">{row.instrument}</span>
          <span className="block text-[11.5px] uppercase tracking-wide text-ink-3">{row.direction}</span>
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      sortValue: (row) => row.size,
      render: (row) => <span className="tnum text-[13px] text-ink-2">{row.size.toFixed(2)}</span>,
      hideOnMobile: true,
    },
    {
      key: "entry",
      header: "Entry / exit",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className="tnum text-[13px] text-ink-2">
          {row.entry.toFixed(2)} → {row.exit ? row.exit.toFixed(2) : "—"}
        </span>
      ),
    },
    {
      key: "pnl",
      header: "P&L",
      align: "right",
      sortValue: (row) => row.pnl,
      render: (row) => (
        <span
          className={`tnum text-[13.5px] font-semibold ${
            row.pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }`}
        >
          {formatSigned(row.pnl)}
        </span>
      ),
    },
    {
      key: "openedAt",
      header: "Opened",
      align: "right",
      sortValue: (row) => new Date(row.openedAt).getTime(),
      render: (row) => <span className="text-[12.5px] text-ink-3">{formatDate(row.openedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <span className="flex justify-end gap-2">
          {row.status === "open" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const result = await closeTradeAction(row.id, 0);
                toast({
                  title: result.status === "success" ? "Trade closed" : "Failed",
                  description: result.message,
                  tone: result.status === "success" ? "success" : "error",
                });
                router.refresh();
              }}
            >
              Close
            </Button>
          ) : null}
          {row.status === "closed" ? (
            <Button size="sm" onClick={() => setAllocating(row)}>
              <Layers className="h-3.5 w-3.5" strokeWidth={1.8} />
              Allocate
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.8fr]">
      <Card className="h-fit">
        <CardHeader title="Log a trade" description="Record the position and its outcome" />
        <form action={action} className="space-y-4 p-5">
          <Field label="Instrument" error={state.errors?.instrument} htmlFor="instrument">
            <Input id="instrument" name="instrument" required placeholder="EUR/USD" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Direction" htmlFor="direction">
              <Select id="direction" name="direction" defaultValue="long">
                <option value="long">Long</option>
                <option value="short">Short</option>
              </Select>
            </Field>
            <Field label="Size" error={state.errors?.size} htmlFor="size">
              <Input id="size" name="size" type="number" step="0.01" min="0.01" required placeholder="2.5" />
            </Field>
            <Field label="Entry" error={state.errors?.entry} htmlFor="entry">
              <Input id="entry" name="entry" type="number" step="0.0001" required placeholder="1.0845" />
            </Field>
            <Field label="Exit" htmlFor="exit">
              <Input id="exit" name="exit" type="number" step="0.0001" placeholder="1.0912" />
            </Field>
          </div>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          {status === "closed" ? (
            <Field label="Realised P&L" hint="Negative for a loss" error={state.errors?.pnl} htmlFor="pnl">
              <Input id="pnl" name="pnl" type="number" step="0.01" defaultValue="0" className="tnum" />
            </Field>
          ) : (
            <input type="hidden" name="pnl" value="0" />
          )}
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" className="min-h-[80px]" placeholder="Thesis, risk, management…" />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Log trade
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Blotter" description={`${trades.length} trades on your book`} />
        <DataTable
          rows={trades}
          columns={columns}
          pageSize={10}
          searchKeys={(row) => `${row.instrument} ${row.direction} ${row.notes ?? ""}`}
          searchPlaceholder="Search instrument or notes…"
          emptyTitle="No trades yet"
          emptyDescription="Log your first trade using the form."
        />
      </Card>

      <ConfirmDialog
        open={Boolean(allocating)}
        onOpenChange={(open) => {
          if (!open) setAllocating(null);
        }}
        title="Allocate this trade outcome"
        description={
          allocating
            ? `${allocating.instrument} ${allocating.direction} · ${formatSigned(
                allocating.pnl,
              )} will be split across ${clients.length} clients. Each client's ledger and balance update atomically.`
            : ""
        }
        summary={[
          { label: "Mode", value: mode === "proportional" ? "Proportional to balance" : "Manual amounts" },
          { label: "Total allocated", value: formatSigned(allocatedTotal) },
          { label: "Trade P&L", value: formatSigned(allocating?.pnl ?? 0) },
        ]}
        confirmLabel="Apply allocation"
        requireWord="ALLOCATE"
        pending={allocPending}
        onConfirm={async () => {
          if (!allocating) return;
          setAllocPending(true);
          const result = await allocateTradeAction(
            allocating.id,
            allocations.filter((row) => row.amount !== 0).map((row) => ({ clientId: row.clientId, amount: row.amount })),
          );
          setAllocPending(false);
          setAllocating(null);
          toast({
            title: result.status === "success" ? "Allocation applied" : "Allocation failed",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
          router.refresh();
        }}
      />

      {allocating ? (
        <Card className="xl:col-span-2">
          <CardHeader
            title="Allocation preview"
            description="Review each client's share before applying"
            action={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === "proportional" ? "primary" : "secondary"}
                  onClick={() => setMode("proportional")}
                >
                  Proportional
                </Button>
                <Button
                  size="sm"
                  variant={mode === "manual" ? "primary" : "secondary"}
                  onClick={() => setMode("manual")}
                >
                  Manual
                </Button>
              </div>
            }
          />
          <ul className="divide-y divide-[var(--border)]">
            {allocations.map((row) => (
              <li key={row.clientId} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{row.name}</span>
                {mode === "manual" ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={manual[row.clientId] ?? ""}
                    onChange={(event) =>
                      setManual((current) => ({ ...current, [row.clientId]: event.target.value }))
                    }
                    className="tnum h-9 w-32"
                    aria-label={`Allocation for ${row.name}`}
                  />
                ) : (
                  <span
                    className={`tnum text-[13.5px] font-semibold ${
                      row.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                    }`}
                  >
                    {formatSigned(row.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="text-[12.5px] text-ink-3">
              Total book value {formatCurrency(totalBalance)}
            </span>
            <span className="tnum text-[13.5px] font-semibold text-ink">
              Allocated {formatSigned(allocatedTotal)}
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
