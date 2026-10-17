import type { DashboardData } from "@/lib/types";

export type Range = "24h" | "7d" | "30d" | "90d" | "all";
const daysFor: Record<Range, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, all: 3650 };
const dayKey = (value: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const label = (key: string) => new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00Z`));

export function getMetrics(data: DashboardData) {
  const current = data.accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const deposited = data.transactions.filter((t) => t.type === "deposit").reduce((sum, t) => sum + Number(t.amount), 0);
  const withdrawn = data.transactions.filter((t) => t.type === "withdrawal").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const profit = data.transactions.filter((t) => ["trade_outcome", "adjustment"].includes(t.type)).reduce((sum, t) => sum + Number(t.amount), 0);
  const closed = data.trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => Number(t.pnl) > 0).length;
  return { current, deposited, withdrawn, profit, returnRate: deposited ? profit / deposited * 100 : 0, clients: data.people.filter((p) => p.role === "client").length, traders: data.people.filter((p) => p.role === "trader").length, pending: data.withdrawals.filter((w) => w.status === "pending").length, openFeedback: data.feedback.filter((f) => f.status !== "resolved").length, totalTrades: data.trades.length, winRate: closed.length ? wins / closed.length * 100 : 0, todayPnl: data.trades.filter((t) => dayKey(t.closedAt || t.openedAt) === dayKey(new Date())).reduce((sum, t) => sum + Number(t.pnl), 0), transactionCount: data.transactions.length };
}

export function getChartData(data: DashboardData, range: Range) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysFor[range] * 86400000);
  const all = [...data.transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const filtered = range === "all" ? all : all.filter((t) => new Date(t.createdAt) >= cutoff);
  const groups = new Map<string, { key: string; name: string; deposits: number; withdrawals: number; trades: number; actions: number; net: number }>();
  const count = range === "all" ? Math.min(120, Math.max(7, Math.ceil((now.getTime() - new Date(all[0]?.createdAt || now).getTime()) / 86400000) + 1)) : daysFor[range];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    const key = dayKey(date);
    groups.set(key, { key, name: label(key), deposits: 0, withdrawals: 0, trades: 0, actions: 0, net: 0 });
  }
  for (const t of filtered) {
    const group = groups.get(dayKey(t.createdAt));
    if (!group) continue;
    group.actions += 1;
    group.net += Number(t.amount);
    if (t.type === "deposit") group.deposits += Number(t.amount);
    if (t.type === "withdrawal") group.withdrawals += Math.abs(Number(t.amount));
    if (t.type === "trade_outcome") group.trades += Number(t.amount);
  }
  const startBalance = data.accounts.reduce((sum, a) => sum + Number(a.balance), 0) - filtered.reduce((sum, t) => sum + Number(t.amount), 0);
  let running = startBalance;
  const timeline = [...groups.values()].map((group) => { running += group.net; return { ...group, balance: Math.round(running * 100) / 100, deposits: Math.round(group.deposits), withdrawals: Math.round(group.withdrawals) }; });
  const types = [
    { name: "Deposits", value: filtered.filter((t) => t.type === "deposit").length, color: "#5B2EE8" },
    { name: "Trade outcomes", value: filtered.filter((t) => t.type === "trade_outcome").length, color: "#8FC9F2" },
    { name: "Withdrawals", value: filtered.filter((t) => t.type === "withdrawal").length, color: "#A789F4" },
    { name: "Adjustments", value: filtered.filter((t) => t.type === "adjustment").length, color: "#D8CEEA" },
  ].filter((item) => item.value > 0);
  return { timeline, types, filtered, updatedAt: data.accounts.reduce((latest, a) => a.updatedAt > latest ? a.updatedAt : latest, data.accounts[0]?.updatedAt || now.toISOString()) };
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `${filename}.csv`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
