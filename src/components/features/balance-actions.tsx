"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, PlusCircle, SlidersHorizontal } from "lucide-react";

import { applyBalanceAction } from "@/app/actions/trader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { cn, formatCurrency, transactionLabel } from "@/lib/utils";

type ActionType = "deposit" | "withdrawal" | "trade_outcome" | "adjustment";

const TABS: { key: ActionType; label: string; icon: typeof PlusCircle; help: string }[] = [
  { key: "deposit", label: "Deposit", icon: PlusCircle, help: "Credit new client funds to the account." },
  {
    key: "withdrawal",
    label: "Withdrawal",
    icon: ArrowDownLeft,
    help: "Debit funds paid out to the client.",
  },
  {
    key: "trade_outcome",
    label: "Trade outcome",
    icon: ArrowUpRight,
    help: "Book a realised profit or loss against the account.",
  },
  {
    key: "adjustment",
    label: "Adjustment",
    icon: SlidersHorizontal,
    help: "Correct the balance. A written reason is mandatory.",
  },
];

export function BalanceActions({
  clientId,
  clientName,
  balance,
  currency,
}: {
  clientId: string;
  clientName: string;
  balance: number;
  currency: string;
}) {
  const [state, action, pending] = useActionState(applyBalanceAction, idleState);
  const [type, setType] = React.useState<ActionType>("deposit");
  const [amount, setAmount] = React.useState("");
  const [direction, setDirection] = React.useState<"credit" | "debit">("credit");
  const [note, setNote] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => crypto.randomUUID());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const bypassRef = React.useRef(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Balance updated", description: state.message, tone: "success" });
      setAmount("");
      setNote("");
      setReference("");
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Change not applied", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  const magnitude = Math.abs(Number(amount || 0));
  const delta =
    type === "deposit"
      ? magnitude
      : type === "withdrawal"
        ? -magnitude
        : direction === "debit"
          ? -magnitude
          : magnitude;
  const projected = Math.round((balance + delta) * 100) / 100;
  const valid = magnitude > 0 && projected >= 0 && (type !== "adjustment" || note.trim().length > 2);

  return (
    <Card data-tour="balance-actions">
      <CardHeader
        title="Balance actions"
        description={`Every action is atomic, logged and notified to ${clientName.split(" ")[0]}.`}
      />

      <div className="grid grid-cols-2 gap-1.5 border-b border-line p-4 sm:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setType(tab.key);
              setDirection("credit");
            }}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-2 text-[12.5px] font-medium transition-colors",
              type === tab.key
                ? "border-transparent bg-inverse text-on-inverse"
                : "border-line text-ink-2 hover:bg-surface hover:text-ink",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {tab.label}
          </button>
        ))}
      </div>

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
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="direction" value={direction} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <p className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-ink-2">
          {TABS.find((tab) => tab.key === type)?.help}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" error={state.errors?.amount} htmlFor="balance-amount">
            <Input
              id="balance-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="1500.00"
              className="tnum"
            />
          </Field>

          {type === "trade_outcome" || type === "adjustment" ? (
            <Field label="Direction" htmlFor="balance-direction">
              <Select
                id="balance-direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value as "credit" | "debit")}
              >
                <option value="credit">Credit (increase balance)</option>
                <option value="debit">Debit (decrease balance)</option>
              </Select>
            </Field>
          ) : (
            <Field label="Reference (optional)" htmlFor="balance-reference">
              <Input
                id="balance-reference"
                name="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="WIRE-48213"
              />
            </Field>
          )}
        </div>

        <Field
          label={type === "adjustment" ? "Reason (required)" : "Note"}
          error={state.errors?.note}
          htmlFor="balance-note"
        >
          <Textarea
            id="balance-note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[80px]"
            placeholder={
              type === "adjustment"
                ? "Explain exactly why this correction is being made…"
                : "Context the client will see in their notification"
            }
          />
        </Field>

        {type === "trade_outcome" || type === "adjustment" ? (
          <input type="hidden" name="reference" value={reference} />
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Projected balance</p>
            <p className="tnum mt-0.5 text-[18px] font-bold tracking-tight text-ink">
              {formatCurrency(projected, currency)}
            </p>
          </div>
          <p className="tnum text-[12.5px] text-ink-3">
            from {formatCurrency(balance, currency)}
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={!valid} loading={pending}>
          Review {transactionLabel[type].toLowerCase()}
        </Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone={delta < 0 ? "danger" : "default"}
        title={`Apply this ${transactionLabel[type].toLowerCase()}?`}
        description={`${clientName} will be notified immediately, and the entry will appear in their ledger and the audit log.`}
        summary={[
          { label: "Client", value: clientName },
          { label: "Action", value: transactionLabel[type] },
          { label: "Amount", value: `${delta >= 0 ? "+" : "−"}${formatCurrency(magnitude, currency)}` },
          {
            label: "Balance",
            before: formatCurrency(balance, currency),
            after: formatCurrency(projected, currency),
          },
          ...(note ? [{ label: "Note", value: note }] : []),
        ]}
        confirmLabel={`Apply ${transactionLabel[type].toLowerCase()}`}
        requireWord={type === "adjustment" ? "ADJUST" : undefined}
        pending={pending}
        onConfirm={() => {
          bypassRef.current = true;
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </Card>
  );
}
