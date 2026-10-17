"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import { AnalyticsCharts } from "@/components/portal/charts";
import { StatCard } from "@/components/portal/stat-card";
import { Heatmap, Leaderboard } from "@/components/portal/heatmaps";
import { FinancialSection } from "@/components/portal/financial-sections";
import { AdminSection } from "@/components/portal/admin-sections";
import { CmsStudio } from "@/components/portal/cms-studio";
import { ProfileSection } from "@/components/portal/profile-section";
import { getMetrics } from "@/lib/analytics";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  initials,
} from "@/lib/format";
import type { DashboardData, Role } from "@/lib/types";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="portal-page-heading">
      <div>
        <span className="portal-eyebrow">
          <span />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function RecentActivity({ data, role }: { data: DashboardData; role: Role }) {
  return (
    <div className="overview-panel">
      <div className="overview-panel-head">
        <div>
          <h3>Recent activity</h3>
          <p>
            The latest movements across{" "}
            {role === "client" ? "your account" : "your workspace"}.
          </p>
        </div>
        <Link
          href={`/${role}/${role === "client" ? "transactions" : role === "admin" ? "audit" : "customers"}`}
          className="panel-link"
        >
          View all <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="activity-list">
        {data.transactions.slice(0, 5).map((item) => {
          const person = data.people.find((p) => p.id === item.clientId);
          const positive = Number(item.amount) >= 0;
          return (
            <div className="activity-item" key={item.id}>
              <span className={`activity-icon ${positive ? "up" : "down"}`}>
                {positive ? (
                  <ArrowDownLeft size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </span>
              <div className="activity-details">
                <strong>{item.type.replaceAll("_", " ")}</strong>
                <span>
                  {role !== "client" && person ? `${person.fullName} · ` : ""}
                  {formatDate(item.createdAt, true)}
                </span>
              </div>
              <strong
                className={`activity-amount numeric ${positive ? "positive" : "negative"}`}
              >
                {positive ? "+" : ""}
                {formatCurrency(item.amount)}
              </strong>
            </div>
          );
        })}
        {!data.transactions.length && (
          <div className="mini-empty">Account activity will appear here.</div>
        )}
      </div>
    </div>
  );
}
function AttentionPanel({ data, role }: { data: DashboardData; role: Role }) {
  const pending = data.withdrawals.filter((item) => item.status === "pending");
  const open = data.feedback.filter((item) => item.status !== "resolved");
  return (
    <div className="overview-panel attention-panel">
      <div className="overview-panel-head">
        <div>
          <h3>
            {role === "client"
              ? "Your dedicated trader"
              : "Needs your attention"}
          </h3>
          <p>
            {role === "client"
              ? "A person to talk to, not just a portal."
              : "Keep the important conversations moving."}
          </p>
        </div>
      </div>
      {role === "client" ? (
        (() => {
          const assignment = data.assignments.find(
            (a) => a.clientId === data.me.id,
          );
          const trader = data.people.find((p) => p.id === assignment?.traderId);
          return (
            <>
              <div className="trader-spotlight">
                <span className="trader-spotlight-avatar">
                  {initials(trader?.fullName || "Northline Team")}
                </span>
                <div>
                  <strong>{trader?.fullName || "Northline team"}</strong>
                  <span>YOUR DEDICATED TRADER</span>
                </div>
                <span className="online-label">
                  <i /> Available
                </span>
              </div>
              <p className="trader-spotlight-copy">
                Have a question about your account? Start a conversation and we
                will be here to help.
              </p>
              <Link href="/client/feedback" className="panel-action">
                Start a conversation <ArrowRight size={16} />
              </Link>
            </>
          );
        })()
      ) : (
        <>
          <Link className="attention-row" href={`/${role}/withdrawals`}>
            <span className="attention-icon amber">
              <Wallet size={17} />
            </span>
            <span>
              <strong>Withdrawal requests</strong>
              <small>{pending.length} awaiting review</small>
            </span>
            <span className="attention-count">{pending.length}</span>
          </Link>
          <Link className="attention-row" href={`/${role}/feedback`}>
            <span className="attention-icon violet">
              <MessageSquareText size={17} />
            </span>
            <span>
              <strong>Open conversations</strong>
              <small>{open.length} in progress</small>
            </span>
            <span className="attention-count">{open.length}</span>
          </Link>
          <Link
            className="attention-row"
            href={`/${role}/${role === "admin" ? "users" : "customers"}`}
          >
            <span className="attention-icon green">
              <UsersRound size={17} />
            </span>
            <span>
              <strong>
                {role === "admin" ? "Platform users" : "Your customers"}
              </strong>
              <small>View and manage accounts</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}
function Overview({ role, data }: { role: Role; data: DashboardData }) {
  const metrics = getMetrics(data);
  const first = data.me.fullName.split(" ")[0];
  const today = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
  const clientStats = [
    {
      label: "Current balance",
      value: metrics.current,
      icon: <Wallet size={21} />,
      note: "Your live account value",
    },
    {
      label: "Total deposited",
      value: metrics.deposited,
      icon: <ArrowDownLeft size={21} />,
      note: "Since opening",
    },
    {
      label: "Net profit / loss",
      value: metrics.profit,
      icon: <TrendingUp size={21} />,
      note: `${formatPercent(metrics.returnRate)} return`,
      positive: metrics.profit >= 0,
    },
    {
      label: "Available to withdraw",
      value: metrics.current,
      icon: <ArrowUpRight size={21} />,
      note: `Total withdrawn ${formatCurrency(metrics.withdrawn)}`,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={`${role.toUpperCase()} / OVERVIEW`}
        title={`Good to see you, ${first}.`}
        description={
          role === "client"
            ? "Here is a clear view of your capital and everything happening around it."
            : role === "trader"
              ? "Here is what is happening across your book today."
              : "A clear view of the entire Northline platform."
        }
        action={
          <div className="heading-date">
            <CalendarDays size={16} />
            {today}
          </div>
        }
      />
      <div className="portal-welcome-strip">
        <span>
          <i /> YOUR WORKSPACE IS LIVE
        </span>
        <span>
          {role === "client"
            ? "Your account, with nothing out of sight."
            : "The details that matter, all in one place."}
        </span>
        <ShieldCheck size={18} />
      </div>
      <div className="stat-grid" data-tour="kpi">
        {role === "client" ? (
          clientStats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              note={s.note}
              positive={s.positive}
            />
          ))
        ) : role === "trader" ? (
          <>
            <StatCard
              label="Assigned clients"
              value={metrics.clients}
              currency={false}
              icon={<UsersRound size={21} />}
              note="People in your care"
            />
            <StatCard
              label="Assets under management"
              value={metrics.current}
              icon={<Wallet size={21} />}
              note="Across your clients"
            />
            <StatCard
              label="Today's P&L"
              value={metrics.todayPnl}
              icon={<TrendingUp size={21} />}
              note="Closed trades today"
              positive={metrics.todayPnl >= 0}
            />
            <StatCard
              label="Open concerns"
              value={metrics.openFeedback}
              currency={false}
              icon={<MessageSquareText size={21} />}
              note={`${metrics.winRate.toFixed(1)}% win rate`}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Platform assets"
              value={metrics.current}
              icon={<Wallet size={21} />}
              note="Total client balances"
            />
            <StatCard
              label="Active clients"
              value={metrics.clients}
              currency={false}
              icon={<UsersRound size={21} />}
              note={`Across ${metrics.traders} traders`}
            />
            <StatCard
              label="Total transactions"
              value={metrics.transactionCount}
              currency={false}
              icon={<Activity size={21} />}
              note={`${metrics.pending} withdrawals pending`}
            />
            <StatCard
              label="Open enquiries"
              value={metrics.openFeedback}
              currency={false}
              icon={<MessageSquareText size={21} />}
              note={`${metrics.totalTrades} trades logged`}
            />
          </>
        )}
      </div>
      <div data-tour="charts">
        <div className="portal-section-head">
          <div>
            <span className="portal-eyebrow">
              <span />
              PERFORMANCE
            </span>
            <h2>
              {role === "client"
                ? "Your balance, over time."
                : "The bigger picture."}
            </h2>
          </div>
          <Link href={`/${role}/analytics`} className="panel-link">
            Explore analytics <ArrowUpRight size={16} />
          </Link>
        </div>
        <AnalyticsCharts data={data} compact />
      </div>
      <div className="overview-bottom">
        <RecentActivity data={data} role={role} />
        <AttentionPanel data={data} role={role} />
      </div>
      {role !== "client" && (
        <div className="overview-extra">
          <Heatmap data={data} />
          <Leaderboard data={data} />
        </div>
      )}
    </>
  );
}
function AnalyticsPage({ role, data }: { role: Role; data: DashboardData }) {
  const metrics = getMetrics(data);
  const closed = data.trades.filter((t) => t.status === "closed");
  const best = closed.length
    ? Math.max(...closed.map((t) => Number(t.pnl)))
    : 0;
  const worst = closed.length
    ? Math.min(...closed.map((t) => Number(t.pnl)))
    : 0;
  const avgResponseHours = data.feedback.length ? "4.2h" : "—";
  return (
    <>
      <PageHeading
        eyebrow="INSIGHTS / LIVE ANALYTICS"
        title="A closer look at performance."
        description="Explore account activity and trends across different time horizons."
        action={
          <span className="live-chip">
            <i /> LIVE UPDATES
          </span>
        }
      />
      <div className="analytics-summary">
        <div>
          <span>TRANSACTION VOLUME</span>
          <strong>
            {formatCurrency(metrics.deposited + metrics.withdrawn)}
          </strong>
          <small>{metrics.transactionCount} recorded movements</small>
        </div>
        <div>
          <span>NET OUTCOME</span>
          <strong className={metrics.profit >= 0 ? "positive" : "negative"}>
            {formatCurrency(metrics.profit)}
          </strong>
          <small>Trade outcomes and adjustments</small>
        </div>
        <div>
          <span>
            {role === "client" ? "RETURN ON DEPOSITS" : "TRADE WIN RATE"}
          </span>
          <strong>
            {role === "client"
              ? formatPercent(metrics.returnRate)
              : `${metrics.winRate.toFixed(1)}%`}
          </strong>
          <small>
            {role === "client"
              ? "Illustrative, not a guarantee"
              : `${metrics.totalTrades} total trades · best ${formatCurrency(best)}`}
          </small>
        </div>
        <div>
          <span>
            {role === "client" ? "TOTAL WITHDRAWN" : "BEST / WORST TRADE"}
          </span>
          <strong>
            {role === "client"
              ? formatCurrency(metrics.withdrawn)
              : formatCurrency(best)}
          </strong>
          <small>
            {role === "client"
              ? "Processed withdrawals"
              : `Worst: ${formatCurrency(worst)} · avg reply ${avgResponseHours}`}
          </small>
        </div>
      </div>
      <AnalyticsCharts data={data} />
      <Heatmap data={data} />
      <Leaderboard data={data} />
      <div className="analytics-notice">
        <CircleHelp size={18} />
        <p>
          Charts are based on recorded account activity in South African Rand.
          Past performance does not guarantee future results.
        </p>
      </div>
    </>
  );
}
export function PortalView({
  role,
  section,
  data,
  detailId,
}: {
  role: Role;
  section: string;
  data: DashboardData;
  detailId?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={`${role}-${section}-${detailId || ""}`}
      initial={reduced ? false : { opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="portal-page"
    >
      {section === "overview" ? (
        <Overview role={role} data={data} />
      ) : section === "analytics" ? (
        <AnalyticsPage role={role} data={data} />
      ) : section === "cms" && role === "admin" ? (
        <CmsStudio data={data} />
      ) : ["users", "contact", "audit", "settings"].includes(section) &&
        role === "admin" ? (
        <AdminSection section={section} data={data} />
      ) : section === "profile" ? (
        <ProfileSection data={data} />
      ) : (
        <FinancialSection
          role={role}
          section={section}
          data={data}
          detailId={detailId}
        />
      )}
    </motion.div>
  );
}
