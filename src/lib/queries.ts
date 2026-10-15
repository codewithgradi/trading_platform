import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accounts,
  feedback,
  notifications,
  profiles,
  traderClients,
  trades,
  transactions,
  withdrawalRequests,
} from "@/db/schema";

export async function getAccount(clientId: string) {
  const [row] = await db.select().from(accounts).where(eq(accounts.clientId, clientId)).limit(1);
  return row ?? null;
}

export async function getClientTransactions(clientId: string, limit = 400) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.clientId, clientId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getClientWithdrawals(clientId: string) {
  return db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.clientId, clientId))
    .orderBy(desc(withdrawalRequests.createdAt));
}

export async function getClientFeedback(clientId: string) {
  return db
    .select()
    .from(feedback)
    .where(eq(feedback.clientId, clientId))
    .orderBy(desc(feedback.createdAt));
}

export async function getNotifications(userId: string, limit = 100) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export type ClientRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
  balance: number;
  currency: string;
  totalDeposited: number;
  totalWithdrawn: number;
  updatedAt: Date;
};

export async function getTraderClients(traderId: string): Promise<ClientRow[]> {
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      status: profiles.status,
      createdAt: profiles.createdAt,
      balance: accounts.balance,
      currency: accounts.currency,
      totalDeposited: accounts.totalDeposited,
      totalWithdrawn: accounts.totalWithdrawn,
      updatedAt: accounts.updatedAt,
    })
    .from(traderClients)
    .innerJoin(profiles, eq(profiles.id, traderClients.clientId))
    .leftJoin(accounts, eq(accounts.clientId, traderClients.clientId))
    .where(eq(traderClients.traderId, traderId))
    .orderBy(desc(accounts.balance));

  return rows.map((row) => ({
    ...row,
    balance: row.balance ?? 0,
    currency: row.currency ?? "USD",
    totalDeposited: row.totalDeposited ?? 0,
    totalWithdrawn: row.totalWithdrawn ?? 0,
    updatedAt: row.updatedAt ?? row.createdAt,
  }));
}

export async function getTraderClientIds(traderId: string) {
  const rows = await db
    .select({ clientId: traderClients.clientId })
    .from(traderClients)
    .where(eq(traderClients.traderId, traderId));
  return rows.map((row) => row.clientId);
}

export async function getTransactionsForClients(clientIds: string[], since?: Date) {
  if (!clientIds.length) return [];
  return db
    .select()
    .from(transactions)
    .where(
      since
        ? and(inArray(transactions.clientId, clientIds), gte(transactions.createdAt, since))
        : inArray(transactions.clientId, clientIds),
    )
    .orderBy(desc(transactions.createdAt))
    .limit(1000);
}

export async function getTraderTrades(traderId: string) {
  return db.select().from(trades).where(eq(trades.traderId, traderId)).orderBy(desc(trades.openedAt));
}

export async function getWithdrawalQueue(clientIds: string[]) {
  if (!clientIds.length) return [];
  return db
    .select({
      request: withdrawalRequests,
      client: { id: profiles.id, fullName: profiles.fullName, email: profiles.email },
      balance: accounts.balance,
    })
    .from(withdrawalRequests)
    .innerJoin(profiles, eq(profiles.id, withdrawalRequests.clientId))
    .leftJoin(accounts, eq(accounts.clientId, withdrawalRequests.clientId))
    .where(inArray(withdrawalRequests.clientId, clientIds))
    .orderBy(desc(withdrawalRequests.createdAt));
}

export async function getFeedbackForClients(clientIds: string[]) {
  if (!clientIds.length) return [];
  return db
    .select({
      item: feedback,
      client: { id: profiles.id, fullName: profiles.fullName, email: profiles.email },
    })
    .from(feedback)
    .innerJoin(profiles, eq(profiles.id, feedback.clientId))
    .where(inArray(feedback.clientId, clientIds))
    .orderBy(desc(feedback.createdAt));
}

export async function getPlatformSnapshot() {
  const [[totals], [userCounts], [pending]] = await Promise.all([
    db
      .select({
        aum: sql<number>`coalesce(sum(${accounts.balance}), 0)::float8`,
        deposited: sql<number>`coalesce(sum(${accounts.totalDeposited}), 0)::float8`,
        withdrawn: sql<number>`coalesce(sum(${accounts.totalWithdrawn}), 0)::float8`,
        accounts: sql<number>`count(*)::int`,
      })
      .from(accounts),
    db
      .select({
        admins: sql<number>`count(*) filter (where ${profiles.role} = 'admin')::int`,
        traders: sql<number>`count(*) filter (where ${profiles.role} = 'trader')::int`,
        clients: sql<number>`count(*) filter (where ${profiles.role} = 'client')::int`,
        suspended: sql<number>`count(*) filter (where ${profiles.status} = 'suspended')::int`,
        newThisMonth: sql<number>`count(*) filter (where ${profiles.createdAt} > now() - interval '30 days')::int`,
      })
      .from(profiles),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending")),
  ]);

  return { totals, userCounts, pendingWithdrawals: pending?.count ?? 0 };
}

export async function getAllTransactions(since?: Date) {
  return db
    .select()
    .from(transactions)
    .where(since ? gte(transactions.createdAt, since) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(2000);
}

export async function getTraderLeaderboard() {
  const rows = await db
    .select({
      traderId: profiles.id,
      traderName: profiles.fullName,
      clients: sql<number>`count(distinct ${traderClients.clientId})::int`,
      aum: sql<number>`coalesce(sum(${accounts.balance}), 0)::float8`,
    })
    .from(profiles)
    .leftJoin(traderClients, eq(traderClients.traderId, profiles.id))
    .leftJoin(accounts, eq(accounts.clientId, traderClients.clientId))
    .where(eq(profiles.role, "trader"))
    .groupBy(profiles.id, profiles.fullName);

  const tradeRows = await db
    .select({
      traderId: trades.traderId,
      netPnl: sql<number>`coalesce(sum(${trades.pnl}), 0)::float8`,
      total: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${trades.pnl} > 0)::int`,
    })
    .from(trades)
    .groupBy(trades.traderId);

  return rows.map((row) => {
    const stats = tradeRows.find((trade) => trade.traderId === row.traderId);
    return {
      ...row,
      netPnl: stats?.netPnl ?? 0,
      trades: stats?.total ?? 0,
      winRate: stats && stats.total ? (stats.wins / stats.total) * 100 : 0,
    };
  });
}
