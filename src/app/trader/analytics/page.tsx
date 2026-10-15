import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import {
  AreaTrend,
  ChartCard,
  DonutBreakdown,
  GroupedBars,
} from "@/components/ui/charts";
import { Card, CardHeader, LiveDot } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth";
import { buildDailyActivity, tradeStats } from "@/lib/analytics";
import {
  getTraderClients,
  getTraderTrades,
  getTransactionsForClients,
} from "@/lib/queries";
import { formatCurrency, formatDate, formatSigned } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function TraderAnalyticsPage() {
  const user = await requireRole("trader");
  const clients = await getTraderClients(user.id);
  const clientIds = clients.map((client) => client.id);
  const [ledger, trades] = await Promise.all([
    getTransactionsForClients(clientIds),
    getTraderTrades(user.id),
  ]);

  const stats = tradeStats(trades);
  const aum = clients.reduce((sum, client) => sum + client.balance, 0);

  const pnlByDay = new Map<string, number>();
  for (const trade of trades.filter((row) => row.status !== "open")) {
    const key = (trade.closedAt ?? trade.openedAt).toISOString().slice(0, 10);
    pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + trade.pnl);
  }
  let cumulative = 0;
  const pnlSeries = [...pnlByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      cumulative += value;
      return {
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${key}T00:00:00Z`)),
        value: Math.round(cumulative * 100) / 100,
      };
    });

  const instrumentMix = Object.entries(
    trades.reduce<Record<string, number>>((acc, trade) => {
      acc[trade.instrument] = (acc[trade.instrument] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const balanceBands = [
    {
      name: "Under $75k",
      value: clients.filter((c) => c.balance < 75_000).length,
      tone: "info" as const,
    },
    {
      name: "$75k – $150k",
      value: clients.filter((c) => c.balance >= 75_000 && c.balance < 150_000)
        .length,
      tone: "warning" as const,
    },
    {
      name: "$150k+",
      value: clients.filter((c) => c.balance >= 150_000).length,
      tone: "positive" as const,
    },
  ].filter((band) => band.value > 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Performance, flow and client distribution across your book."
        action={<LiveDot label="Live data" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Book value"
          value={formatCurrency(aum)}
          hint="Total AUM"
          index={0}
        />
        <StatCard
          label="Realised P&L"
          value={formatSigned(stats.netPnl)}
          tone={stats.netPnl >= 0 ? "positive" : "negative"}
          hint={`${stats.closed} closed trades`}
          index={1}
        />
        <StatCard
          label="Best / worst trade"
          value={`${formatCurrency(stats.best)} / ${formatCurrency(stats.worst)}`}
          hint="Single-trade extremes"
          index={2}
        />
        <StatCard
          label="Profit factor"
          value={
            Number.isFinite(stats.profitFactor)
              ? stats.profitFactor.toFixed(2)
              : "∞"
          }
          tone={stats.profitFactor >= 1 ? "positive" : "negative"}
          hint="Gross profit ÷ gross loss"
          index={3}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Cumulative realised P&L"
          description="Running total of closed trade outcomes"
        >
          <AreaTrend data={pnlSeries} ariaLabel="Cumulative profit and loss" />
        </ChartCard>
        <ChartCard
          title="Client balance distribution"
          description="How your book is spread"
        >
          <DonutBreakdown
            data={balanceBands.map((band) => ({
              ...band,
              name: `${band.name} (${band.value} clients)`,
            }))}
            ariaLabel="Client balance bands"
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Daily ledger activity"
          description="Deposits and withdrawals, last 14 days"
        >
          <GroupedBars
            data={
              buildDailyActivity(ledger, 14) as unknown as Array<
                Record<string, string | number>
              >
            }
            series={[
              { key: "deposits", name: "Deposits", tone: "positive" },
              { key: "withdrawals", name: "Withdrawals", tone: "negative" },
              { key: "trades", name: "Trade entries", tone: "info" },
            ]}
            ariaLabel="Daily ledger activity"
          />
        </ChartCard>

        <Card>
          <CardHeader title="Most traded instruments" />
          <ul className="divide-y divide-[var(--border)]">
            {instrumentMix.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13.5px] text-ink">{row.name}</span>
                <span className="tnum text-[13px] font-semibold text-ink-2">
                  {row.value} trades
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Client leaderboard"
          description="Ranked by balance, with lifetime flows"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-5 py-2.5 text-left font-semibold">Client</th>
                <th className="px-5 py-2.5 text-right font-semibold">
                  Balance
                </th>
                <th className="px-5 py-2.5 text-right font-semibold">
                  Deposited
                </th>
                <th className="px-5 py-2.5 text-right font-semibold">
                  Withdrawn
                </th>
                <th className="px-5 py-2.5 text-right font-semibold">Since</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-5 py-3 text-[13.5px] font-medium text-ink">
                    {client.fullName}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13px] text-ink">
                    {formatCurrency(client.balance, client.currency)}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13px] text-ink-2">
                    {formatCurrency(client.totalDeposited, client.currency)}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13px] text-ink-2">
                    {formatCurrency(client.totalWithdrawn, client.currency)}
                  </td>
                  <td className="px-5 py-3 text-right text-[12.5px] text-ink-3">
                    {formatDate(client.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
