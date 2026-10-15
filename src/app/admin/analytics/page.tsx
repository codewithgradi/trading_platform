import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { accounts, feedback, profiles, trades } from "@/db/schema";
import { PageHeader } from "@/components/features/portal-shell";
import { ChartCard, DonutBreakdown, GroupedBars } from "@/components/ui/charts";
import { Card, CardHeader, LiveDot } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth";
import { buildDailyActivity, tradeStats } from "@/lib/analytics";
import {
  getAllTransactions,
  getPlatformSnapshot,
  getTraderLeaderboard,
} from "@/lib/queries";
import { formatCurrency, formatSigned } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRole("admin");

  const [snapshot, ledger, leaderboard, allTrades, feedbackRows, topAccounts] =
    await Promise.all([
      getPlatformSnapshot(),
      getAllTransactions(),
      getTraderLeaderboard(),
      db.select().from(trades),
      db.select().from(feedback),
      db
        .select({ name: profiles.fullName, balance: accounts.balance })
        .from(accounts)
        .innerJoin(profiles, eq(profiles.id, accounts.clientId))
        .orderBy(desc(accounts.balance))
        .limit(8),
    ]);

  const stats = tradeStats(allTrades);
  const [growth] = await db
    .select({
      last30: sql<number>`count(*) filter (where ${profiles.createdAt} > now() - interval '30 days')::int`,
      prev30: sql<number>`count(*) filter (where ${profiles.createdAt} between now() - interval '60 days' and now() - interval '30 days')::int`,
    })
    .from(profiles)
    .where(eq(profiles.role, "client"));

  const growthRate = growth.prev30
    ? ((growth.last30 - growth.prev30) / growth.prev30) * 100
    : 0;
  const openFeedback = feedbackRows.filter(
    (row) => row.status !== "resolved",
  ).length;
  const resolvedFeedback = feedbackRows.filter(
    (row) => row.status === "resolved",
  ).length;

  return (
    <>
      <PageHeader
        title="Platform analytics"
        description="Capital, performance, growth and service quality across every desk."
        action={<LiveDot label="Live data" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Platform AUM"
          value={formatCurrency(snapshot.totals.aum)}
          // format={(n) => formatCurrency(n)}
          hint={`${snapshot.totals.accounts} funded accounts`}
          index={0}
        />
        <StatCard
          label="Lifetime deposits"
          value={formatCurrency(snapshot.totals.deposited)}
          // format={(n) => formatCurrency(n)}
          hint={`${formatCurrency(snapshot.totals.withdrawn)} withdrawn`}
          index={1}
        />
        <StatCard
          label="Client growth (30d)"
          value={`${growth.last30}`}
          delta={{
            value: `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(0)}%`,
            positive: growthRate >= 0,
          }}
          hint="New client accounts"
          index={2}
        />
        <StatCard
          label="Realised P&L"
          value={formatCurrency(stats.netPnl)}
          // format={(n) => formatSigned(n)}
          tone={stats.netPnl >= 0 ? "positive" : "negative"}
          hint={`${stats.closed} closed trades · ${stats.winRate.toFixed(0)}% win rate`}
          index={3}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Daily platform flow"
          description="Deposits and withdrawals, last 21 days"
        >
          <GroupedBars
            data={
              buildDailyActivity(ledger, 21) as unknown as Array<
                Record<string, string | number>
              >
            }
            series={[
              { key: "deposits", name: "Deposits", tone: "positive" },
              { key: "withdrawals", name: "Withdrawals", tone: "negative" },
            ]}
            ariaLabel="Platform deposits and withdrawals"
          />
        </ChartCard>

        <ChartCard
          title="Clients per trader"
          description="How the book is distributed"
        >
          <DonutBreakdown
            data={leaderboard.map((row, index) => ({
              name: `${row.traderName} (${row.clients} clients)`,
              value: row.clients,
              tone: (["positive", "info", "warning", "negative"] as const)[
                index % 4
              ],
            }))}
            // valueFormatter={(value) => `${value} clients`}
            ariaLabel="Clients per trader"
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Largest accounts"
            description="Top balances platform-wide"
          />
          <ul className="divide-y divide-[var(--border)]">
            {topAccounts.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13.5px] text-ink">{row.name}</span>
                <span className="tnum text-[13px] font-semibold text-ink">
                  {formatCurrency(row.balance)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Service quality"
            description="Feedback resolution across the platform"
          />
          <dl className="divide-y divide-[var(--border)]">
            {[
              { label: "Open conversations", value: String(openFeedback) },
              {
                label: "Resolved conversations",
                value: String(resolvedFeedback),
              },
              {
                label: "Resolution rate",
                value: feedbackRows.length
                  ? `${((resolvedFeedback / feedbackRows.length) * 100).toFixed(0)}%`
                  : "—",
              },
              {
                label: "Pending withdrawals",
                value: String(snapshot.pendingWithdrawals),
              },
              {
                label: "Suspended accounts",
                value: String(snapshot.userCounts.suspended),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-3"
              >
                <dt className="text-[12.5px] text-ink-2">{row.label}</dt>
                <dd className="tnum text-[13px] font-semibold text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
