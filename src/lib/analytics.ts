import type { Transaction } from "@/db/schema";

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "all", label: "All", days: 3650 },
];

export function rangeDays(range: RangeKey) {
  return RANGES.find((item) => item.key === range)?.days ?? 30;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shortLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export type SeriesPoint = { label: string; value: number };

/** Daily closing balance series derived from ledger entries. */
export function buildBalanceSeries(
  rows: Pick<Transaction, "createdAt" | "balanceAfter">[],
  currentBalance: number,
  days: number,
): SeriesPoint[] {
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byDay = new Map<string, number>();
  for (const row of sorted) byDay.set(dayKey(row.createdAt), row.balanceAfter);

  const points: SeriesPoint[] = [];
  const span = Math.min(days, 180);
  let running = sorted.length ? sorted[0].balanceAfter : currentBalance;

  for (let i = span - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - i);
    const key = dayKey(date);
    const value = byDay.get(key);
    if (value !== undefined) running = value;
    points.push({ label: shortLabel(key), value: Math.round(running * 100) / 100 });
  }

  if (points.length) points[points.length - 1].value = Math.round(currentBalance * 100) / 100;
  return points;
}

export type ActivityPoint = { label: string; deposits: number; withdrawals: number; trades: number };

export function buildDailyActivity(rows: Transaction[], days = 14): ActivityPoint[] {
  const buckets = new Map<string, ActivityPoint>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - i);
    const key = dayKey(date);
    buckets.set(key, { label: shortLabel(key), deposits: 0, withdrawals: 0, trades: 0 });
  }

  for (const row of rows) {
    const bucket = buckets.get(dayKey(row.createdAt));
    if (!bucket) continue;
    if (row.type === "deposit") bucket.deposits += Math.abs(row.amount);
    else if (row.type === "withdrawal") bucket.withdrawals += Math.abs(row.amount);
    else bucket.trades += 1;
  }

  return [...buckets.values()];
}

export function typeDistribution(rows: Transaction[]) {
  const counts = { deposit: 0, withdrawal: 0, trade_outcome: 0, adjustment: 0 };
  for (const row of rows) counts[row.type as keyof typeof counts] += 1;
  return [
    { name: "Deposits", value: counts.deposit, tone: "positive" as const },
    { name: "Withdrawals", value: counts.withdrawal, tone: "negative" as const },
    { name: "Trade outcomes", value: counts.trade_outcome, tone: "info" as const },
    { name: "Adjustments", value: counts.adjustment, tone: "warning" as const },
  ].filter((item) => item.value > 0);
}

export function filterByRange<T extends { createdAt: Date }>(rows: T[], range: RangeKey): T[] {
  if (range === "all") return rows;
  const cutoff = Date.now() - rangeDays(range) * 24 * 60 * 60 * 1000;
  return rows.filter((row) => row.createdAt.getTime() >= cutoff);
}

export function tradeStats(trades: { pnl: number; status: string }[]) {
  const closed = trades.filter((trade) => trade.status !== "open");
  const wins = closed.filter((trade) => trade.pnl > 0);
  const losses = closed.filter((trade) => trade.pnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  return {
    total: trades.length,
    closed: closed.length,
    open: trades.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    best: closed.reduce((max, trade) => Math.max(max, trade.pnl), 0),
    worst: closed.reduce((min, trade) => Math.min(min, trade.pnl), 0),
    netPnl: closed.reduce((sum, trade) => sum + trade.pnl, 0),
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
  };
}
