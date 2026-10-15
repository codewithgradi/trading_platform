"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { reviewWithdrawalAction } from "@/app/actions/trader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select, Textarea, statusTone } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";

export type QueueRow = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  method: string;
  destination: string | null;
  status: string;
  balance: number;
  reason: string | null;
  createdAt: string;
};

type Decision = "approved" | "rejected" | "processed";

export function WithdrawalQueue({ rows }: { rows: QueueRow[] }) {
  const [filter, setFilter] = React.useState("pending");
  const [target, setTarget] = React.useState<{ row: QueueRow; decision: Decision } | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const visible = rows.filter((row) => (filter === "all" ? true : row.status === filter));

  const submit = async () => {
    if (!target) return;
    setPending(true);
    const formData = new FormData();
    formData.set("requestId", target.row.id);
    formData.set("decision", target.decision);
    formData.set("reason", reason);
    const result = await reviewWithdrawalAction({ status: "idle" }, formData);
    setPending(false);
    setTarget(null);
    setReason("");
    toast({
      title: result.status === "success" ? "Queue updated" : "Action failed",
      description: result.message,
      tone: result.status === "success" ? "success" : "error",
    });
    router.refresh();
  };

  return (
    <Card>
      <CardHeader
        title="Withdrawal queue"
        description="Approve debits the client's balance immediately and notifies them."
        action={
          <Select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-10 w-44"
            aria-label="Filter requests"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processed">Settled</option>
            <option value="rejected">Rejected</option>
            <option value="all">All requests</option>
          </Select>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="There are no requests with this status right now."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((row, index) => (
            <motion.li
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold tracking-tight text-ink">{row.clientName}</p>
                  <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>
                </div>
                <p className="tnum mt-1 text-[18px] font-bold tracking-tight text-ink">
                  {formatCurrency(row.amount)}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {row.method.replace("_", " ")} · {row.destination} · requested{" "}
                  {formatDate(row.createdAt, true)} · balance {formatCurrency(row.balance)}
                </p>
                {row.reason ? <p className="mt-1 text-[12px] text-ink-2">Reason: {row.reason}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {row.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => setTarget({ row, decision: "approved" })}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTarget({ row, decision: "rejected" })}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {row.status === "approved" ? (
                  <Button size="sm" variant="secondary" onClick={() => setTarget({ row, decision: "processed" })}>
                    Mark settled
                  </Button>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setReason("");
          }
        }}
        tone={target?.decision === "rejected" ? "danger" : "default"}
        title={
          target?.decision === "approved"
            ? "Approve this withdrawal?"
            : target?.decision === "rejected"
              ? "Reject this withdrawal?"
              : "Mark this withdrawal as settled?"
        }
        description={
          target?.decision === "approved"
            ? "The amount is debited from the client's balance straight away and the ledger entry is written."
            : target?.decision === "rejected"
              ? "The client is notified with your reason. No funds move."
              : "Confirm the funds have reached the client's nominated account."
        }
        summary={
          target
            ? [
                { label: "Client", value: target.row.clientName },
                { label: "Amount", value: formatCurrency(target.row.amount) },
                ...(target.decision === "approved"
                  ? [
                      {
                        label: "Balance",
                        before: formatCurrency(target.row.balance),
                        after: formatCurrency(target.row.balance - target.row.amount),
                      },
                    ]
                  : []),
              ]
            : []
        }
        confirmLabel={
          target?.decision === "approved"
            ? "Apply withdrawal"
            : target?.decision === "rejected"
              ? "Reject request"
              : "Mark settled"
        }
        requireWord={target?.decision === "approved" ? "APPROVE" : undefined}
        pending={pending}
        onConfirm={submit}
      />

      {target?.decision === "rejected" ? (
        <div className="border-t border-line p-5">
          <Field label="Reason for rejection (shared with the client)" htmlFor="reject-reason">
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[70px]"
              placeholder="Explain why this request cannot be met right now…"
            />
          </Field>
        </div>
      ) : null}
    </Card>
  );
}
