"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, MessageSquare, Wallet } from "lucide-react";

import { AreaTrend, ChartCard, DonutBreakdown, GroupedBars } from "@/components/ui/charts";
import { Avatar, PageHeader } from "@/components/features/portal-shell";
import { Button, Card, CardHeader, CountUp, EmptyState, LiveDot } from "@/components/ui/primitives";
import { LastUpdated, RangeSelector, StatCard } from "@/components/ui/stat-card";
import type { ActivityPoint, SeriesPoint } from "@/lib/analytics";
import { formatCurrency, formatDate, formatPercent, formatSigned, timeAgo, transactionLabel } from "@/lib/utils";

type RecentRow = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
};

type LivePayload = {
  now: number;
  balance: number;
  currency: string;
  totalDeposited: number;
  totalWithdrawn: number;
  recent: RecentRow[];
};

export function ClientDashboard({
  firstName,
  balance,
  currency,
  deposited,
  withdrawn,
  netPnl,
  returnPct,
  pendingWithdrawals,
  series,
  activity,
  distribution,
  recent,
  trader,
}: {
  firstName: string;
  balance: number;
  currency: string;
  deposited: number;
  withdrawn: number;
  netPnl: number;
  returnPct: number;
  pendingWithdrawals: number;
  series: Record<string, SeriesPoint[]>;
  activity: ActivityPoint[];
  distribution: { name: string; value: number; tone?: "positive" | "negative" | "warning" | "info" }[];
  recent: RecentRow[];
  trader: { name: string; email: string; avatarUrl: string | null; bio: string | null; since: string } | null;
}) {
  const [range, setRange] = React.useState("30d");

  const { data } = useQuery<LivePayload>({
    queryKey: ["live", "client"],
    queryFn: async () => {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error("Live feed unavailable");
      return response.json();
    },
    refetchInterval: 6000,
    initialData: {
      now: Date.now(),
      balance,
      currency,
      totalDeposited: deposited,
      totalWithdrawn: withdrawn,
      recent,
    },
  });

  const liveBalance = data?.balance ?? balance;
  const liveRecent = data?.recent?.length ? data.recent : recent;
  const points = series[range] ?? series["30d"];
  const sparkValues = (series["30d"] ?? []).map((point) => point.value);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Your capital, your trader and every movement on the account — updated live."
        action={
          <>
            <Link href="/client/withdrawals">
              <Button variant="secondary" size="sm">
                <Wallet className="h-4 w-4" strokeWidth={1.8} />
                Request withdrawal
              </Button>
            </Link>
            <Link href="/client/feedback">
              <Button size="sm">
                <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
                Contact your trader
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <motion.div
          data-tour="balance-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-line bg-elevated p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Account balance
            </p>
            <div className="flex items-center gap-3">
              <LiveDot />
              <LastUpdated timestamp={data?.now ?? Date.now()} />
            </div>
          </div>
          <p className="mt-3 text-[40px] font-bold leading-none tracking-tight text-ink sm:text-[48px]">
            <CountUp value={liveBalance} format={(n) => formatCurrency(n, currency)} />
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <span className="text-ink-3">
              Net P&L{" "}
              <span className={netPnl >= 0 ? "font-semibold text-[var(--positive)]" : "font-semibold text-[var(--negative)]"}>
                {formatSigned(netPnl, currency)}
              </span>
            </span>
            <span className="text-ink-3">
              Return{" "}
              <span className={returnPct >= 0 ? "font-semibold text-[var(--positive)]" : "font-semibold text-[var(--negative)]"}>
                {formatPercent(returnPct)}
              </span>
            </span>
            {pendingWithdrawals > 0 ? (
              <span className="text-ink-3">
                <span className="font-semibold text-[var(--warning)]">{pendingWithdrawals}</span> withdrawal
                pending
              </span>
            ) : null}
          </div>
        </motion.div>

        <Card className="p-6">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">Your trader</p>
          {trader ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={trader.name} src={trader.avatarUrl} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{trader.name}</p>
                  <p className="truncate text-[12.5px] text-ink-3">{trader.email}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{trader.bio}</p>
              <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
                Managing your account since {formatDate(trader.since)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-[13px] text-ink-2">
              A trader will be assigned to your account shortly. The desk will be in touch.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total deposited"
          numericValue={data?.totalDeposited ?? deposited}
          format={(n) => formatCurrency(n, currency)}
          hint="Lifetime funding"
          index={0}
        />
        <StatCard
          label="Total withdrawn"
          numericValue={data?.totalWithdrawn ?? withdrawn}
          format={(n) => formatCurrency(n, currency)}
          hint="Lifetime distributions"
          index={1}
        />
        <StatCard
          label="Net profit / loss"
          numericValue={netPnl}
          format={(n) => formatSigned(n, currency)}
          tone={netPnl >= 0 ? "positive" : "negative"}
          hint="Balance less net funding"
          spark={sparkValues}
          sparkTone={netPnl >= 0 ? "positive" : "negative"}
          index={2}
        />
        <StatCard
          label="Return on capital"
          value={formatPercent(returnPct)}
          tone={returnPct >= 0 ? "positive" : "negative"}
          hint="Since inception"
          index={3}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Balance history"
          description="Daily closing balance derived from your ledger"
          action={
            <RangeSelector
              value={range}
              onChange={setRange}
              options={[
                { key: "7d", label: "7d" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
                { key: "all", label: "All" },
              ]}
            />
          }
          footnote="Each point is the closing balance for that day, including deposits, withdrawals and allocated trade outcomes."
        >
          <AreaTrend data={points} ariaLabel="Balance history over time" />
        </ChartCard>

        <ChartCard title="Movement mix" description="How your ledger entries break down">
          <DonutBreakdown data={distribution} ariaLabel="Distribution of transaction types" />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Daily activity" description="Deposits and withdrawals over the last 14 days">
          <GroupedBars
            data={activity as unknown as Array<Record<string, string | number>>}
            series={[
              { key: "deposits", name: "Deposits", tone: "positive" },
              { key: "withdrawals", name: "Withdrawals", tone: "negative" },
            ]}
            ariaLabel="Daily deposits versus withdrawals"
          />
        </ChartCard>

        <Card>
          <CardHeader
            title="Recent activity"
            description="The latest movements on your account"
            action={
              <Link
                href="/client/transactions"
                className="text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                View all
              </Link>
            }
          />
          {liveRecent.length === 0 ? (
            <EmptyState title="No activity yet" description="Movements will appear here as soon as they are booked." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {liveRecent.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      row.amount >= 0
                        ? "border-[var(--positive)]/25 text-[var(--positive)]"
                        : "border-[var(--negative)]/25 text-[var(--negative)]"
                    }`}
                  >
                    {row.amount >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" strokeWidth={1.8} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {transactionLabel[row.type] ?? row.type}
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {row.note ?? "—"} · {timeAgo(row.createdAt)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`tnum block text-[13px] font-semibold ${
                        row.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                      }`}
                    >
                      {formatSigned(row.amount, currency)}
                    </span>
                    <span className="tnum block text-[11.5px] text-ink-3">
                      {formatCurrency(row.balanceAfter, currency)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
