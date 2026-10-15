"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AreaTrend, ChartCard, DonutBreakdown, GroupedBars } from "@/components/ui/charts";
import { PageHeader } from "@/components/features/portal-shell";
import { Badge, Card, CardHeader, LiveDot } from "@/components/ui/primitives";
import { LastUpdated, RangeSelector, StatCard } from "@/components/ui/stat-card";
import type { ActivityPoint, SeriesPoint } from "@/lib/analytics";
import { formatCurrency, formatPercent, formatSigned, timeAgo } from "@/lib/utils";

type LivePayload = {
  now: number;
  aum: number;
  deposited: number;
  withdrawn: number;
  clients: number;
  traders: number;
  pendingWithdrawals: number;
};

export function AdminDashboard({
  aum,
  deposited,
  withdrawn,
  clients,
  traders,
  newThisMonth,
  pendingWithdrawals,
  openConcerns,
  series,
  activity,
  mix,
  leaderboard,
  recentAudit,
}: {
  aum: number;
  deposited: number;
  withdrawn: number;
  clients: number;
  traders: number;
  newThisMonth: number;
  pendingWithdrawals: number;
  openConcerns: number;
  series: Record<string, SeriesPoint[]>;
  activity: ActivityPoint[];
  mix: { name: string; value: number; tone?: "positive" | "negative" | "warning" | "info" }[];
  leaderboard: { traderId: string; traderName: string; clients: number; aum: number; netPnl: number; winRate: number }[];
  recentAudit: { id: string; action: string; actorName: string | null; entity: string; createdAt: string }[];
}) {
  const [range, setRange] = React.useState("30d");

  const { data } = useQuery<LivePayload>({
    queryKey: ["live", "admin"],
    queryFn: async () => {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error("Live feed unavailable");
      return response.json();
    },
    refetchInterval: 7000,
    initialData: { now: Date.now(), aum, deposited, withdrawn, clients, traders, pendingWithdrawals },
  });

  const points = series[range] ?? series["30d"];
  const netFlow = (data?.deposited ?? deposited) - (data?.withdrawn ?? withdrawn);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every trader, client and dollar on the platform, updated live."
        action={
          <div className="flex items-center gap-3">
            <LiveDot />
            <LastUpdated timestamp={data?.now ?? Date.now()} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Platform AUM"
          numericValue={data?.aum ?? aum}
          format={(n) => formatCurrency(n)}
          hint="Across all client accounts"
          index={0}
        />
        <StatCard
          label="Net capital flow"
          numericValue={netFlow}
          format={(n) => formatSigned(n)}
          tone={netFlow >= 0 ? "positive" : "negative"}
          hint="Deposits less withdrawals"
          index={1}
        />
        <StatCard label="Clients" value={String(data?.clients ?? clients)} hint={`${newThisMonth} new in 30 days`} index={2} />
        <StatCard label="Traders" value={String(data?.traders ?? traders)} hint="Active desks" index={3} />
        <StatCard
          label="Needs attention"
          value={String((data?.pendingWithdrawals ?? pendingWithdrawals) + openConcerns)}
          tone={(data?.pendingWithdrawals ?? 0) + openConcerns > 0 ? "warning" : "default"}
          hint={`${data?.pendingWithdrawals ?? pendingWithdrawals} withdrawals · ${openConcerns} concerns`}
          index={4}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Assets under management"
          description="Platform-wide balance trend"
          action={
            <RangeSelector
              value={range}
              onChange={setRange}
              options={[
                { key: "7d", label: "7d" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
              ]}
            />
          }
        >
          <AreaTrend data={points} ariaLabel="Platform assets under management over time" />
        </ChartCard>

        <ChartCard title="Transaction mix" description="Ledger entries by type">
          <DonutBreakdown data={mix} ariaLabel="Transaction type distribution" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Daily flow" description="Deposits versus withdrawals, last 14 days">
          <GroupedBars
            data={activity as unknown as Array<Record<string, string | number>>}
            series={[
              { key: "deposits", name: "Deposits", tone: "positive" },
              { key: "withdrawals", name: "Withdrawals", tone: "negative" },
            ]}
            ariaLabel="Daily deposits and withdrawals"
          />
        </ChartCard>

        <Card>
          <CardHeader
            title="Recent audit events"
            action={
              <Link
                href="/admin/audit"
                className="text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                View log
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--border)]">
            {recentAudit.map((row) => (
              <li key={row.id} className="px-5 py-3">
                <p className="text-[13px] font-medium text-ink">{row.action}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  {row.actorName ?? "System"} · {row.entity} · {timeAgo(row.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Trader comparison" description="Book size, performance and win rate" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-5 py-2.5 text-left font-semibold">Trader</th>
                <th className="px-5 py-2.5 text-right font-semibold">Clients</th>
                <th className="px-5 py-2.5 text-right font-semibold">AUM</th>
                <th className="px-5 py-2.5 text-right font-semibold">Realised P&L</th>
                <th className="px-5 py-2.5 text-right font-semibold">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.traderId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-[13.5px] font-medium text-ink">{row.traderName}</td>
                  <td className="tnum px-5 py-3 text-right text-[13px] text-ink-2">{row.clients}</td>
                  <td className="tnum px-5 py-3 text-right text-[13px] text-ink">{formatCurrency(row.aum)}</td>
                  <td
                    className={`tnum px-5 py-3 text-right text-[13px] font-semibold ${
                      row.netPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                    }`}
                  >
                    {formatSigned(row.netPnl)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={row.winRate >= 50 ? "positive" : "warning"}>
                      {formatPercent(row.winRate).replace("+", "")}
                    </Badge>
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
