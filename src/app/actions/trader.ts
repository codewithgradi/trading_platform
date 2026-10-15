"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { profiles, tradeAllocations, trades, withdrawalRequests } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { fail, ok, zodErrors, type ActionState } from "@/lib/action-state";
import {
  applyBalanceChange,
  assertTraderOwnsClient,
  notifyUser,
  recordAudit,
} from "@/lib/ledger";
import { formatCurrency } from "@/lib/utils";
import { balanceActionSchema, tradeSchema, withdrawalReviewSchema } from "@/lib/validators";

export async function applyBalanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("trader", "admin");

  const parsed = balanceActionSchema.safeParse({
    clientId: String(formData.get("clientId") ?? ""),
    type: formData.get("type"),
    amount: formData.get("amount"),
    direction: formData.get("direction") ?? "credit",
    note: String(formData.get("note") ?? "").trim(),
    reference: String(formData.get("reference") ?? "").trim(),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const { clientId, type, amount, direction, note, reference, idempotencyKey } = parsed.data;

  if (type === "adjustment" && !note) {
    return fail("A reason is required for manual adjustments.", { note: "Explain why you're adjusting" });
  }

  if (user.role === "trader") await assertTraderOwnsClient(user.id, clientId);

  const magnitude = Math.abs(amount);
  const delta =
    type === "deposit"
      ? magnitude
      : type === "withdrawal"
        ? -magnitude
        : direction === "debit"
          ? -magnitude
          : magnitude;

  try {
    const result = await applyBalanceChange({
      clientId,
      traderId: user.role === "trader" ? user.id : null,
      type,
      delta,
      note,
      reference,
      idempotencyKey,
      actor: user,
    });

    revalidatePath(`/trader/customers/${clientId}`);
    revalidatePath("/trader");
    revalidatePath("/trader/customers");

    if (result.duplicate) return ok("That action was already applied — no duplicate was created.");

    return ok(
      `Balance updated from ${formatCurrency(result.balanceBefore)} to ${formatCurrency(result.balanceAfter)}.`,
      { balanceAfter: result.balanceAfter },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not apply that change.");
  }
}

export async function reviewWithdrawalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("trader", "admin");

  const parsed = withdrawalReviewSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    decision: formData.get("decision"),
    reason: String(formData.get("reason") ?? "").trim(),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const [request] = await db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.id, parsed.data.requestId))
    .limit(1);
  if (!request) return fail("That request no longer exists.");
  if (user.role === "trader") await assertTraderOwnsClient(user.id, request.clientId);

  if (parsed.data.decision === "rejected" && !parsed.data.reason) {
    return fail("Give the client a reason for the rejection.", { reason: "Reason is required" });
  }

  try {
    if (parsed.data.decision === "approved") {
      if (request.status !== "pending") return fail("This request has already been reviewed.");
      await applyBalanceChange({
        clientId: request.clientId,
        traderId: user.role === "trader" ? user.id : null,
        type: "withdrawal",
        delta: -Math.abs(request.amount),
        note: `Withdrawal approved — ${request.destination ?? request.method}`,
        reference: `WDR-${request.id.slice(0, 8).toUpperCase()}`,
        idempotencyKey: `withdrawal-approve-${request.id}`,
        actor: user,
      });
    }

    await db
      .update(withdrawalRequests)
      .set({
        status: parsed.data.decision,
        reviewedBy: user.id,
        reason: parsed.data.reason || request.reason,
        reviewedAt: request.reviewedAt ?? new Date(),
        processedAt: parsed.data.decision === "processed" ? new Date() : request.processedAt,
      })
      .where(eq(withdrawalRequests.id, request.id));

    await notifyUser({
      userId: request.clientId,
      type: "withdrawal",
      title: `Withdrawal ${parsed.data.decision} · ${formatCurrency(request.amount)}`,
      body:
        parsed.data.decision === "approved"
          ? "Your withdrawal was approved and debited from your balance. Settlement is in progress."
          : parsed.data.decision === "processed"
            ? "Your withdrawal has been settled to your nominated account."
            : `Your withdrawal request was rejected. ${parsed.data.reason}`,
      data: { requestId: request.id },
    });

    await recordAudit({
      actor: user,
      action: `withdrawal.${parsed.data.decision}`,
      entity: "withdrawal_requests",
      entityId: request.id,
      before: { status: request.status },
      after: { status: parsed.data.decision, reason: parsed.data.reason || null },
    });

    revalidatePath("/trader/withdrawals");
    revalidatePath("/admin/withdrawals");
    return ok(`Request ${parsed.data.decision}.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update that request.");
  }
}

export async function createTradeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("trader");

  const parsed = tradeSchema.safeParse({
    instrument: String(formData.get("instrument") ?? "").trim(),
    direction: formData.get("direction"),
    size: formData.get("size"),
    entry: formData.get("entry"),
    exit: formData.get("exit") ? formData.get("exit") : undefined,
    pnl: formData.get("pnl") || 0,
    status: formData.get("status"),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const [trade] = await db
    .insert(trades)
    .values({
      traderId: user.id,
      instrument: parsed.data.instrument,
      direction: parsed.data.direction,
      size: parsed.data.size,
      entry: parsed.data.entry,
      exit: parsed.data.exit ?? null,
      pnl: parsed.data.status === "closed" ? parsed.data.pnl : 0,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      closedAt: parsed.data.status === "closed" ? new Date() : null,
    })
    .returning();

  await recordAudit({
    actor: user,
    action: "trade.create",
    entity: "trades",
    entityId: trade.id,
    after: { instrument: trade.instrument, pnl: trade.pnl, status: trade.status },
  });

  revalidatePath("/trader/trades");
  return ok("Trade logged.", { id: trade.id });
}

export async function closeTradeAction(tradeId: string, pnl: number): Promise<ActionState> {
  const user = await assertRole("trader");
  const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  if (!trade || trade.traderId !== user.id) return fail("That trade is not on your blotter.");

  await db
    .update(trades)
    .set({ status: "closed", pnl, closedAt: new Date() })
    .where(eq(trades.id, tradeId));

  await recordAudit({
    actor: user,
    action: "trade.close",
    entity: "trades",
    entityId: tradeId,
    before: { status: trade.status, pnl: trade.pnl },
    after: { status: "closed", pnl },
  });

  revalidatePath("/trader/trades");
  return ok("Trade closed.");
}

/** Allocate a closed trade's P&L across the trader's book. */
export async function allocateTradeAction(
  tradeId: string,
  allocations: { clientId: string; amount: number }[],
): Promise<ActionState> {
  const user = await assertRole("trader");
  const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  if (!trade || trade.traderId !== user.id) return fail("That trade is not on your blotter.");
  if (trade.status === "allocated") return fail("This trade has already been allocated.");
  if (!allocations.length) return fail("Select at least one client to allocate to.");

  try {
    for (const allocation of allocations) {
      if (!allocation.amount) continue;
      await assertTraderOwnsClient(user.id, allocation.clientId);
      await applyBalanceChange({
        clientId: allocation.clientId,
        traderId: user.id,
        type: "trade_outcome",
        delta: allocation.amount,
        note: `${trade.instrument} ${trade.direction} — ${allocation.amount >= 0 ? "profit" : "loss"} allocation`,
        reference: `TRD-${trade.id.slice(0, 8).toUpperCase()}`,
        idempotencyKey: `trade-${trade.id}-${allocation.clientId}`,
        actor: user,
      });
      await db.insert(tradeAllocations).values({
        tradeId: trade.id,
        clientId: allocation.clientId,
        amount: allocation.amount,
      });
    }

    await db.update(trades).set({ status: "allocated" }).where(eq(trades.id, trade.id));
    await recordAudit({
      actor: user,
      action: "trade.allocate",
      entity: "trades",
      entityId: trade.id,
      after: { allocations },
    });

    revalidatePath("/trader/trades");
    revalidatePath("/trader/customers");
    return ok("Trade outcome allocated across the selected clients.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Allocation failed.");
  }
}

export async function saveClientNoteAction(clientId: string, note: string): Promise<ActionState> {
  const user = await assertRole("trader", "admin");
  if (user.role === "trader") await assertTraderOwnsClient(user.id, clientId);

  const [client] = await db.select().from(profiles).where(eq(profiles.id, clientId)).limit(1);
  if (!client) return fail("Client not found.");

  await db.update(profiles).set({ bio: note.slice(0, 400) }).where(eq(profiles.id, clientId));
  await recordAudit({
    actor: user,
    action: "client.note",
    entity: "profiles",
    entityId: clientId,
    before: { note: client.bio },
    after: { note },
  });

  revalidatePath(`/trader/customers/${clientId}`);
  return ok("Note saved.");
}
