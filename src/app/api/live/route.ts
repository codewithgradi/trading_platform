import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { accounts, feedback, transactions, withdrawalRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTraderClientIds, getPlatformSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Polled by the dashboards to keep KPIs live without a page refresh. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const now = Date.now();

  if (user.role === "client") {
    const [account] = await db.select().from(accounts).where(eq(accounts.clientId, user.id)).limit(1);
    const recent = await db
      .select()
      .from(transactions)
      .where(eq(transactions.clientId, user.id))
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    return NextResponse.json({
      now,
      balance: account?.balance ?? 0,
      currency: account?.currency ?? "USD",
      totalDeposited: account?.totalDeposited ?? 0,
      totalWithdrawn: account?.totalWithdrawn ?? 0,
      recent: recent.map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  }

  if (user.role === "trader") {
    const clientIds = await getTraderClientIds(user.id);
    if (!clientIds.length) {
      return NextResponse.json({ now, aum: 0, todayPnl: 0, pendingWithdrawals: 0, openConcerns: 0 });
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [[aumRow], [pnlRow], [pendingRow], [concernRow]] = await Promise.all([
      db
        .select({ aum: sql<number>`coalesce(sum(${accounts.balance}), 0)::float8` })
        .from(accounts)
        .where(inArray(accounts.clientId, clientIds)),
      db
        .select({ pnl: sql<number>`coalesce(sum(${transactions.amount}), 0)::float8` })
        .from(transactions)
        .where(
          and(
            inArray(transactions.clientId, clientIds),
            eq(transactions.type, "trade_outcome"),
            gte(transactions.createdAt, startOfDay),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(withdrawalRequests)
        .where(and(inArray(withdrawalRequests.clientId, clientIds), eq(withdrawalRequests.status, "pending"))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(feedback)
        .where(and(inArray(feedback.clientId, clientIds), eq(feedback.status, "open"))),
    ]);

    return NextResponse.json({
      now,
      aum: aumRow?.aum ?? 0,
      todayPnl: pnlRow?.pnl ?? 0,
      pendingWithdrawals: pendingRow?.count ?? 0,
      openConcerns: concernRow?.count ?? 0,
    });
  }

  const snapshot = await getPlatformSnapshot();
  return NextResponse.json({
    now,
    aum: snapshot.totals.aum,
    deposited: snapshot.totals.deposited,
    withdrawn: snapshot.totals.withdrawn,
    clients: snapshot.userCounts.clients,
    traders: snapshot.userCounts.traders,
    pendingWithdrawals: snapshot.pendingWithdrawals,
  });
}
