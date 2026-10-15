import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accounts,
  auditLog,
  notifications,
  profiles,
  traderClients,
  transactions,
} from "@/db/schema";
import { formatCurrency, transactionLabel } from "@/lib/utils";
import type { Profile } from "@/db/schema";

export type BalanceActionType = "deposit" | "withdrawal" | "trade_outcome" | "adjustment";

export type ApplyBalanceInput = {
  clientId: string;
  traderId?: string | null;
  type: BalanceActionType;
  /** Signed delta: positive credits the account, negative debits it. */
  delta: number;
  note?: string | null;
  reference?: string | null;
  idempotencyKey: string;
  actor: Pick<Profile, "id" | "fullName" | "role">;
  silent?: boolean;
};

export type ApplyBalanceResult = {
  balanceBefore: number;
  balanceAfter: number;
  transactionId: string;
  duplicate: boolean;
};

/**
 * Atomic balance mutation.
 * Locks the account row, writes the ledger entry, updates lifetime totals,
 * notifies the client and records the change in the audit log — all inside a
 * single Postgres transaction. Idempotency keys prevent double submission.
 */
export async function applyBalanceChange(input: ApplyBalanceInput): Promise<ApplyBalanceResult> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing.length) {
      return {
        balanceBefore: existing[0].balanceBefore,
        balanceAfter: existing[0].balanceAfter,
        transactionId: existing[0].id,
        duplicate: true,
      };
    }

    const locked = await tx.execute<{ balance: string; currency: string }>(
      sql`select balance, currency from accounts where client_id = ${input.clientId} for update`,
    );
    const lockedRow = locked.rows[0];
    if (!lockedRow) throw new Error("This client does not have a trading account yet.");

    const currency = lockedRow.currency;
    const balanceBefore = Number(lockedRow.balance);
    const balanceAfter = Math.round((balanceBefore + input.delta) * 100) / 100;

    if (balanceAfter < 0) {
      throw new Error(
        `This change would push the balance to ${formatCurrency(balanceAfter, currency)}. Balances cannot go negative.`,
      );
    }

    await tx
      .update(accounts)
      .set({
        balance: balanceAfter,
        updatedAt: new Date(),
        ...(input.type === "deposit"
          ? { totalDeposited: sql`${accounts.totalDeposited} + ${Math.abs(input.delta)}` }
          : {}),
        ...(input.type === "withdrawal"
          ? { totalWithdrawn: sql`${accounts.totalWithdrawn} + ${Math.abs(input.delta)}` }
          : {}),
      })
      .where(eq(accounts.clientId, input.clientId));

    const [entry] = await tx
      .insert(transactions)
      .values({
        clientId: input.clientId,
        traderId: input.traderId ?? null,
        type: input.type,
        amount: input.delta,
        balanceBefore,
        balanceAfter,
        note: input.note || null,
        reference: input.reference || null,
        idempotencyKey: input.idempotencyKey,
        status: "completed",
      })
      .returning();

    if (!input.silent) {
      const movement = input.delta >= 0 ? "increased" : "decreased";
      await tx.insert(notifications).values({
        userId: input.clientId,
        type: "balance",
        title: `${transactionLabel[input.type]} · ${formatCurrency(Math.abs(input.delta), currency)}`,
        body: `Your balance ${movement} from ${formatCurrency(balanceBefore, currency)} to ${formatCurrency(
          balanceAfter,
          currency,
        )}.${input.note ? ` Note: ${input.note}` : ""}`,
        data: {
          transactionId: entry.id,
          type: input.type,
          amount: input.delta,
          balanceBefore,
          balanceAfter,
        },
      });
    }

    await tx.insert(auditLog).values({
      actorId: input.actor.id,
      actorName: input.actor.fullName,
      action: `balance.${input.type}`,
      entity: "accounts",
      entityId: input.clientId,
      before: { balance: balanceBefore },
      after: { balance: balanceAfter, amount: input.delta, note: input.note ?? null },
    });

    return { balanceBefore, balanceAfter, transactionId: entry.id, duplicate: false };
  });
}

export async function recordAudit(params: {
  actor: Pick<Profile, "id" | "fullName">;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await db.insert(auditLog).values({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

export async function notifyUser(params: {
  userId: string;
  type: "balance" | "withdrawal" | "feedback" | "system";
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data ?? null,
  });
}

/** Trader ↔ client authorisation check used by every trader mutation. */
export async function assertTraderOwnsClient(traderId: string, clientId: string) {
  const [link] = await db
    .select()
    .from(traderClients)
    .where(and(eq(traderClients.traderId, traderId), eq(traderClients.clientId, clientId)))
    .limit(1);
  if (!link) throw new Error("This client is not assigned to you.");
}

export async function getAssignedTrader(clientId: string) {
  const [row] = await db
    .select({ trader: profiles, assignedAt: traderClients.assignedAt })
    .from(traderClients)
    .innerJoin(profiles, eq(profiles.id, traderClients.traderId))
    .where(eq(traderClients.clientId, clientId))
    .limit(1);
  return row ?? null;
}
