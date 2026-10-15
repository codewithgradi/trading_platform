import type { Metadata } from "next";

import { ClientDashboard } from "@/components/features/client-dashboard";
import { requireRole } from "@/lib/auth";
import { buildBalanceSeries, buildDailyActivity, typeDistribution } from "@/lib/analytics";
import { getAccount, getClientTransactions, getClientWithdrawals } from "@/lib/queries";
import { getAssignedTrader } from "@/lib/ledger";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ClientDashboardPage() {
  const user = await requireRole("client");
  const [account, ledger, assignment, withdrawals] = await Promise.all([
    getAccount(user.id),
    getClientTransactions(user.id),
    getAssignedTrader(user.id),
    getClientWithdrawals(user.id),
  ]);

  const balance = account?.balance ?? 0;
  const currency = account?.currency ?? "USD";
  const deposited = account?.totalDeposited ?? 0;
  const withdrawn = account?.totalWithdrawn ?? 0;
  const netPnl = balance - deposited + withdrawn;
  const returnPct = deposited > 0 ? (netPnl / deposited) * 100 : 0;

  const series90 = buildBalanceSeries(ledger, balance, 90);
  const series30 = buildBalanceSeries(ledger, balance, 30);
  const series7 = buildBalanceSeries(ledger, balance, 7);
  const activity = buildDailyActivity(ledger, 14);
  const distribution = typeDistribution(ledger);

  return (
    <ClientDashboard
      firstName={user.fullName.split(" ")[0]}
      balance={balance}
      currency={currency}
      deposited={deposited}
      withdrawn={withdrawn}
      netPnl={netPnl}
      returnPct={returnPct}
      pendingWithdrawals={withdrawals.filter((row) => row.status === "pending").length}
      series={{ "7d": series7, "30d": series30, "90d": series90, all: series90 }}
      activity={activity}
      distribution={distribution}
      recent={ledger.slice(0, 6).map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      }))}
      trader={
        assignment
          ? {
              name: assignment.trader.fullName,
              email: assignment.trader.email,
              avatarUrl: assignment.trader.avatarUrl,
              bio: assignment.trader.bio,
              since: assignment.assignedAt.toISOString(),
            }
          : null
      }
    />
  );
}
