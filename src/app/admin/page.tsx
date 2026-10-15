import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLog, feedback } from "@/db/schema";
import { AdminDashboard } from "@/components/features/admin-dashboard";
import { requireRole } from "@/lib/auth";
import { buildDailyActivity, typeDistribution } from "@/lib/analytics";
import { getAllTransactions, getPlatformSnapshot, getTraderLeaderboard } from "@/lib/queries";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireRole("admin");

  const [snapshot, ledger, leaderboard, audits, openConcerns] = await Promise.all([
    getPlatformSnapshot(),
    getAllTransactions(),
    getTraderLeaderboard(),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(6),
    db.select({ id: feedback.id }).from(feedback).where(eq(feedback.status, "open")),
  ]);

  const aum = snapshot.totals.aum;
  const daily = new Map<string, number>();
  for (const row of ledger) {
    const key = row.createdAt.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + row.amount);
  }

  const buildSeries = (days: number) => {
    const points: { label: string; value: number }[] = [];
    let running = aum;
    for (let i = 0; i < days; i += 1) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - i);
      const key = date.toISOString().slice(0, 10);
      points.unshift({
        label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
          new Date(`${key}T00:00:00Z`),
        ),
        value: Math.round(running * 100) / 100,
      });
      running -= daily.get(key) ?? 0;
    }
    return points;
  };

  return (
    <AdminDashboard
      aum={aum}
      deposited={snapshot.totals.deposited}
      withdrawn={snapshot.totals.withdrawn}
      clients={snapshot.userCounts.clients}
      traders={snapshot.userCounts.traders}
      newThisMonth={snapshot.userCounts.newThisMonth}
      pendingWithdrawals={snapshot.pendingWithdrawals}
      openConcerns={openConcerns.length}
      series={{ "7d": buildSeries(7), "30d": buildSeries(30), "90d": buildSeries(90) }}
      activity={buildDailyActivity(ledger, 14)}
      mix={typeDistribution(ledger)}
      leaderboard={leaderboard}
      recentAudit={audits.map((row) => ({
        id: row.id,
        action: row.action,
        actorName: row.actorName,
        entity: row.entity,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
