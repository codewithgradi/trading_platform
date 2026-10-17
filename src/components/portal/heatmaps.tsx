"use client";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function Heatmap({ data }: { data: DashboardData }) {
  const weeks = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const t of data.transactions) {
      const key = dayKey(new Date(t.createdAt));
      map.set(key, (map.get(key) || 0) + 1);
    }
    const days: { key: string; label: string; count: number; date: Date }[] = [];
    for (let i = 13 * 7 - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const key = dayKey(date);
      days.push({ key, label: key, count: map.get(key) || 0, date });
    }
    const cols: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
    return cols;
  }, [data.transactions]);

  const max = Math.max(1, ...weeks.flat().map((d) => d.count));
  function intensity(count: number) {
    if (count === 0) return "empty";
    if (count <= max * 0.25) return "low";
    if (count <= max * 0.55) return "mid";
    if (count <= max * 0.85) return "high";
    return "peak";
  }

  return (
    <div className="heatmap-card">
      <div className="heatmap-head">
        <div>
          <h3>Daily activity heatmap</h3>
          <p>Trade and transaction intensity across the last 91 days</p>
        </div>
        <span className="heatmap-legend">
          <span>Less</span>
          <i className="heat-empty" />
          <i className="heat-low" />
          <i className="heat-mid" />
          <i className="heat-high" />
          <i className="heat-peak" />
          <span>More</span>
        </span>
      </div>
      <div className="heatmap-grid" role="img" aria-label={`Activity heatmap with ${weeks.flat().length} days, maximum ${max} actions in a day.`}>
        {weeks.map((col, idx) => (
          <div key={idx} className="heatmap-col">
            {col.map((day) => (
              <span key={day.key} className={`heat-cell heat-${intensity(day.count)}`} title={`${day.key}: ${day.count} actions — ${formatCurrency(data.transactions.filter((t) => dayKey(new Date(t.createdAt)) === day.key).reduce((s, t) => s + Number(t.amount), 0))} net`} />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-months">
        {["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

export function Leaderboard({ data }: { data: DashboardData }) {
  const rows = data.people
    .filter((p) => p.role === "client")
    .map((person) => {
      const clientTx = data.transactions.filter((t) => t.clientId === person.id);
      const balance = Number(data.accounts.find((a) => a.clientId === person.id)?.balance || 0);
      const pnl = clientTx.filter((t) => t.type === "trade_outcome").reduce((s, t) => s + Number(t.amount), 0);
      return { person, balance, pnl, count: clientTx.length };
    })
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  if (!rows.length) return null;
  return (
    <div className="leaderboard-card">
      <div className="leaderboard-head">
        <h3>Top clients by balance</h3>
        <p>Highest account values across the platform</p>
      </div>
      <div className="leaderboard-list">
        {rows.map((row, i) => (
          <div key={row.person.id} className="leaderboard-entry">
            <span className="rank">{String(i + 1).padStart(2, "0")}</span>
            <span className="lb-avatar" style={row.person.avatarUrl ? { backgroundImage: `url(${row.person.avatarUrl})` } : undefined}>
              {row.person.avatarUrl ? null : row.person.fullName.slice(0, 1)}
            </span>
            <span className="lb-name">
              <strong>{row.person.fullName}</strong>
              <small>{row.count} ledger entries</small>
            </span>
            <span className="lb-pnl numeric" data-positive={row.pnl >= 0}>
              {row.pnl >= 0 ? "+" : ""}
              {formatCurrency(row.pnl)}
            </span>
            <strong className="lb-balance numeric">{formatCurrency(row.balance)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
