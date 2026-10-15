"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { AreaTrend, ChartCard, DonutBreakdown, GroupedBars } from "@/components/ui/charts";
import { Badge, Card, CardHeader, LiveDot } from "@/components/ui/primitives";
import { LastUpdated, RangeSelector, StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/features/portal-shell";
import type { ActivityPoint, SeriesPoint } from "@/lib/analytics";
import { formatCurrency, formatPercent, formatSigned, timeAgo } from "@/lib/utils";

type LivePayload = {
  now: number;
  aum: number;
  todayPnl: number;
  pendingWithdrawals: number;
  openConcerns: number;
};

export function TraderDashboard({
  name,
  clientCount,
  aum,
  todayPnl,
  pendingWithdrawals,
  openConcerns,
  winRate,
  netPnl,
  profitFactor,
  avgWin,
  avgLoss,
  series,
  activity,
  outcomeMix,
  topClients,
  recent,
}: {
  name: string;
  clientCount: number;
  aum: number;
  todayPnl: number;
  pendingWithdrawals: number;
  openConcerns: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  series: Record<string, SeriesPoint[]>;
  activity: ActivityPoint[];
  outcomeMix: { name: string; value: number; tone?: "positive" | "negative" | "warning" | "info" }[];
  topClients: { id: string; name: string; balance: number; change: number }[];
  recent: { id: string; clientName: string; type: string; amount: number; createdAt: string }[];
}) {
  const [range, setRange] = React.useState("30d");

  const { data } = useQuery<LivePayload>({
    queryKey: ["live", "trader"],
    queryFn: async () => {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error("Live feed unavailable");
      return response.json();
    },
    refetchInterval: 6000,
    initialData: { now: Date.now(), aum, todayPnl, pendingWithdrawals, openConcerns },
  });

  const points = series[range] ?? series["30d"];

  return (
    <>
      <PageHeader
        title={`Desk overview, ${name.split(" ")[0]}`}
        description="Your book, today's performance and anything waiting on you."
        action={
          <div className="flex items-center gap-3">
            <LiveDot />
            <LastUpdated timestamp={data?.now ?? Date.now()} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Assigned clients" value={String(clientCount)} hint="Active in your book" index={0} />
        <StatCard
          label="Assets under management"
          numericValue={data?.aum ?? aum}
          format={(n) => formatCurrency(n)}
          hint="Sum of client balances"
          index={1}
        />
        <StatCard
          label="Today's P&L"
          numericValue={data?.todayPnl ?? todayPnl}
          format={(n) => formatSigned(n)}
          tone={(data?.todayPnl ?? todayPnl) >= 0 ? "positive" : "negative"}
          hint="Allocated outcomes today"
          index={2}
        />
        <StatCard label="Win rate" value={`${winRate.toFixed(1)}%`} hint="Closed trades" index={3} />
        <StatCard
          label="Needs attention"
          value={`${(data?.pendingWithdrawals ?? pendingWithdrawals) + (data?.openConcerns ?? openConcerns)}`}
          tone={(data?.pendingWithdrawals ?? 0) + (data?.openConcerns ?? 0) > 0 ? "warning" : "default"}
          hint={`${data?.pendingWithdrawals ?? pendingWithdrawals} withdrawals · ${
            data?.openConcerns ?? openConcerns
          } concerns`}
          index={4}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Book value over time"
          description="Combined balance across your assigned clients"
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
          <AreaTrend data={points} ariaLabel="Book value over time" />
        </ChartCard>

        <ChartCard title="Trade outcomes" description="Wins versus losses on closed trades">
          <DonutBreakdown data={outcomeMix} ariaLabel="Win loss distribution" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Daily flow" description="Deposits and withdrawals booked across your book">
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
          <CardHeader title="Performance detail" />
          <dl className="divide-y divide-[var(--border)]">
            {[
              { label: "Net P&L (closed)", value: formatSigned(netPnl), tone: netPnl >= 0 },
              { label: "Average win", value: formatCurrency(avgWin), tone: true },
              { label: "Average loss", value: formatCurrency(avgLoss), tone: false },
              {
                label: "Profit factor",
                value: Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞",
                tone: profitFactor >= 1,
              },
              { label: "Win rate", value: formatPercent(winRate, 1).replace("+", ""), tone: winRate >= 50 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <dt className="text-[12.5px] text-ink-2">{row.label}</dt>
                <dd
                  className={`tnum text-[13px] font-semibold ${
                    row.tone ? "text-[var(--positive)]" : "text-[var(--negative)]"
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Largest accounts"
            description="Your biggest balances"
            action={
              <Link
                href="/trader/customers"
                className="text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                All customers
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--border)]">
            {topClients.map((client) => (
              <li key={client.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link
                  href={`/trader/customers/${client.id}`}
                  className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink hover:underline"
                >
                  {client.name}
                </Link>
                <span className="tnum text-[13px] font-semibold text-ink">
                  {formatCurrency(client.balance)}
                </span>
                <Badge tone={client.change >= 0 ? "positive" : "negative"}>
                  <ArrowUpRight
                    className={`h-3 w-3 ${client.change < 0 ? "rotate-90" : ""}`}
                    strokeWidth={2.2}
                  />
                  {formatPercent(client.change)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent ledger activity" description="Across every client you manage" />
          <ul className="divide-y divide-[var(--border)]">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{row.clientName}</span>
                  <span className="block text-[11.5px] text-ink-3">
                    {row.type.replace("_", " ")} · {timeAgo(row.createdAt)}
                  </span>
                </span>
                <span
                  className={`tnum text-[13px] font-semibold ${
                    row.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                  }`}
                >
                  {formatSigned(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
