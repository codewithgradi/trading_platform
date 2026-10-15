import type { Metadata } from "next";

import { TraderDashboard } from "@/components/features/trader-dashboard";
import { requireRole } from "@/lib/auth";
import { buildDailyActivity, tradeStats } from "@/lib/analytics";
import {
  getFeedbackForClients,
  getTraderClients,
  getTraderTrades,
  getTransactionsForClients,
  getWithdrawalQueue,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function TraderOverviewPage() {
  const user = await requireRole("trader");
  const clients = await getTraderClients(user.id);
  const clientIds = clients.map((client) => client.id);

  const [ledger, trades, queue, threads] = await Promise.all([
    getTransactionsForClients(clientIds),
    getTraderTrades(user.id),
    getWithdrawalQueue(clientIds),
    getFeedbackForClients(clientIds),
  ]);

  const aum = clients.reduce((sum, client) => sum + client.balance, 0);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayPnl = ledger
    .filter((row) => row.type === "trade_outcome" && row.createdAt >= startOfDay)
    .reduce((sum, row) => sum + row.amount, 0);

  const stats = tradeStats(trades);

  // Aggregate book value: approximate daily series by scaling the ledger series to AUM.
  const bookSeries = (days: number) => {
    const daily = new Map<string, number>();
    for (const row of ledger) {
      const key = row.createdAt.toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) ?? 0) + row.amount);
    }
    const points: { label: string; value: number }[] = [];
    let running = aum;
    const labels: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - i);
      labels.push(date.toISOString().slice(0, 10));
    }
    for (const key of labels) {
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

  const topClients = [...clients]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((client) => {
      const clientLedger = ledger.filter((row) => row.clientId === client.id);
      const recentChange = clientLedger
        .filter((row) => row.createdAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)
        .reduce((sum, row) => sum + row.amount, 0);
      const base = client.balance - recentChange;
      return {
        id: client.id,
        name: client.fullName,
        balance: client.balance,
        change: base > 0 ? (recentChange / base) * 100 : 0,
      };
    });

  return (
    <TraderDashboard
      name={user.fullName}
      clientCount={clients.length}
      aum={aum}
      todayPnl={todayPnl}
      pendingWithdrawals={queue.filter((row) => row.request.status === "pending").length}
      openConcerns={threads.filter((row) => row.item.status === "open").length}
      winRate={stats.winRate}
      netPnl={stats.netPnl}
      profitFactor={stats.profitFactor}
      avgWin={stats.avgWin}
      avgLoss={stats.avgLoss}
      series={{ "7d": bookSeries(7), "30d": bookSeries(30), "90d": bookSeries(90) }}
      activity={buildDailyActivity(ledger, 14)}
      outcomeMix={(
        [
          { name: "Winning trades", value: stats.wins, tone: "positive" },
          { name: "Losing trades", value: stats.losses, tone: "negative" },
          { name: "Open", value: stats.open, tone: "warning" },
        ] as const
      )
        .filter((item) => item.value > 0)
        .map((item) => ({ ...item }))}
      topClients={topClients}
      recent={ledger.slice(0, 7).map((row) => ({
        id: row.id,
        clientName: clients.find((client) => client.id === row.clientId)?.fullName ?? "Client",
        type: row.type,
        amount: row.amount,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}


