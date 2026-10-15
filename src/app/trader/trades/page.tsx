import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import { TradesManager } from "@/components/features/trades-manager";
import { requireRole } from "@/lib/auth";
import { tradeStats } from "@/lib/analytics";
import { getTraderClients, getTraderTrades } from "@/lib/queries";

export const metadata: Metadata = { title: "Trades" };
export const dynamic = "force-dynamic";

export default async function TraderTradesPage() {
  const user = await requireRole("trader");
  const [trades, clients] = await Promise.all([getTraderTrades(user.id), getTraderClients(user.id)]);
  const stats = tradeStats(trades);

  return (
    <>
      <PageHeader
        title="Trades"
        description={`${stats.total} logged · ${stats.winRate.toFixed(1)}% win rate · net ${stats.netPnl.toFixed(
          2,
        )} realised`}
      />
      <TradesManager
        trades={trades.map((trade) => ({
          id: trade.id,
          instrument: trade.instrument,
          direction: trade.direction,
          size: trade.size,
          entry: trade.entry,
          exit: trade.exit,
          pnl: trade.pnl,
          status: trade.status,
          notes: trade.notes,
          openedAt: trade.openedAt.toISOString(),
          closedAt: trade.closedAt?.toISOString() ?? null,
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.fullName,
          balance: client.balance,
        }))}
      />
    </>
  );
}
