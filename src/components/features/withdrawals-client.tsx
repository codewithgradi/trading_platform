"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Clock, X } from "lucide-react";

import { requestWithdrawalAction } from "@/app/actions/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, statusTone } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { formatCurrency, formatDate } from "@/lib/utils";

export type WithdrawalView = {
  id: string;
  amount: number;
  method: string;
  destination: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
};

const STAGES = ["pending", "approved", "processed"] as const;

function Timeline({ row }: { row: WithdrawalView }) {
  if (row.status === "rejected") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--negative)]/25 bg-[var(--negative)]/8 px-3 py-2.5">
        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--negative)]" strokeWidth={2} />
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Rejected.</span> {row.reason}
        </p>
      </div>
    );
  }

  const currentIndex = STAGES.indexOf(row.status as (typeof STAGES)[number]);

  return (
    <ol className="mt-4 flex items-center gap-2">
      {STAGES.map((stage, index) => {
        const done = index <= currentIndex;
        return (
          <li key={stage} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                done
                  ? "border-[var(--positive)] bg-[var(--positive)]/12 text-[var(--positive)]"
                  : "border-line text-ink-3"
              }`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={2.6} /> : index + 1}
            </span>
            <span className={`text-[11.5px] font-medium capitalize ${done ? "text-ink" : "text-ink-3"}`}>
              {stage === "processed" ? "settled" : stage}
            </span>
            {index < STAGES.length - 1 ? (
              <span className={`h-px flex-1 ${index < currentIndex ? "bg-[var(--positive)]" : "bg-[var(--border)]"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function WithdrawalsClient({
  balance,
  currency,
  rows,
}: {
  balance: number;
  currency: string;
  rows: WithdrawalView[];
}) {
  const [state, action, pending] = useActionState(requestWithdrawalAction, idleState);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("bank_transfer");
  const [destination, setDestination] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const bypassRef = React.useRef(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Request submitted", description: state.message, tone: "success" });
      setAmount("");
      setDestination("");
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Request not submitted", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  const parsedAmount = Number(amount || 0);
  const valid = parsedAmount > 0 && parsedAmount <= balance && destination.trim().length >= 4;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="h-fit">
        <CardHeader title="Request a withdrawal" description={`Available: ${formatCurrency(balance, currency)}`} />
        <form
          ref={formRef}
          action={action}
          className="space-y-4 p-5"
          onSubmit={(event) => {
            if (bypassRef.current) {
              bypassRef.current = false;
              return;
            }
            event.preventDefault();
            setConfirmOpen(true);
          }}
        >
          <Field label="Amount" error={state.errors?.amount} htmlFor="amount">
            <Input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="5000.00"
              className="tnum"
            />
          </Field>
          <Field label="Method" htmlFor="method">
            <Select id="method" name="method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="wire">International wire</option>
              <option value="stablecoin">Stablecoin (USDC)</option>
            </Select>
          </Field>
          <Field
            label="Destination"
            error={state.errors?.destination}
            hint="Reference the account we hold on file, e.g. Chase ••4821"
            htmlFor="destination"
          >
            <Input
              id="destination"
              name="destination"
              required
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Chase ••4821"
            />
          </Field>
          <Button type="submit" className="w-full" loading={pending} disabled={!valid}>
            Review request
          </Button>
          <p className="text-[12px] leading-relaxed text-ink-3">
            Requests are reviewed by your trader. Approved amounts are debited immediately and settled to
            your nominated account.
          </p>
        </form>
      </Card>

      <Card>
        <CardHeader title="Your requests" description="Status timeline for every withdrawal you've made" />
        {rows.length === 0 ? (
          <EmptyState
            title="No withdrawal requests yet"
            description="When you request a withdrawal it will appear here with a live status timeline."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row, index) => (
              <motion.li
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                className="px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="tnum text-[16px] font-bold tracking-tight text-ink">
                      {formatCurrency(row.amount, currency)}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {row.method.replace("_", " ")} · {row.destination}
                    </p>
                  </div>
                  <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>
                </div>
                <Timeline row={row} />
                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <Clock className="h-3 w-3" strokeWidth={1.8} />
                  Requested {formatDate(row.createdAt, true)}
                  {row.processedAt ? ` · settled ${formatDate(row.processedAt, true)}` : ""}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this withdrawal request?"
        description="Your trader will review the request. Your balance stays unchanged until it is approved."
        summary={[
          { label: "Amount", value: formatCurrency(parsedAmount || 0, currency) },
          { label: "Method", value: method.replace("_", " ") },
          { label: "Destination", value: destination || "—" },
          {
            label: "Balance if approved",
            before: formatCurrency(balance, currency),
            after: formatCurrency(balance - (parsedAmount || 0), currency),
          },
        ]}
        confirmLabel="Submit request"
        pending={pending}
        onConfirm={() => {
          bypassRef.current = true;
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </div>
  );
}
