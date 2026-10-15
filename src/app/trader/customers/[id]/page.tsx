import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { db } from "@/db";
import { profiles, traderClients } from "@/db/schema";
import { BalanceActions } from "@/components/features/balance-actions";
import { LedgerTable } from "@/components/features/ledger-table";
import { Avatar, PageHeader } from "@/components/features/portal-shell";
import { AreaTrend, ChartCard } from "@/components/ui/charts";
import { Badge, Card, CardHeader, statusTone } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { buildBalanceSeries } from "@/lib/analytics";
import { getAccount, getClientFeedback, getClientTransactions, getClientWithdrawals } from "@/lib/queries";
import { formatCurrency, formatDate, formatSigned } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function TraderCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("trader");

  const [link] = await db
    .select()
    .from(traderClients)
    .where(and(eq(traderClients.traderId, user.id), eq(traderClients.clientId, id)))
    .limit(1);
  if (!link) notFound();

  const [client] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!client) notFound();

  const [account, ledger, withdrawals, threads] = await Promise.all([
    getAccount(id),
    getClientTransactions(id),
    getClientWithdrawals(id),
    getClientFeedback(id),
  ]);

  const balance = account?.balance ?? 0;
  const currency = account?.currency ?? "USD";
  const deposited = account?.totalDeposited ?? 0;
  const withdrawn = account?.totalWithdrawn ?? 0;
  const netPnl = balance - deposited + withdrawn;

  return (
    <>
      <Link
        href="/trader/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        All customers
      </Link>

      <PageHeader
        title={client.fullName}
        description={`${client.email}${client.phone ? ` · ${client.phone}` : ""}`}
        action={<Badge tone={statusTone[client.status] ?? "neutral"}>{client.status}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={client.fullName} src={client.avatarUrl} size={48} />
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  Current balance
                </p>
                <p className="tnum text-[28px] font-bold leading-tight tracking-tight text-ink">
                  {formatCurrency(balance, currency)}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
              {[
                { label: "Deposited", value: formatCurrency(deposited, currency) },
                { label: "Withdrawn", value: formatCurrency(withdrawn, currency) },
                { label: "Net P&L", value: formatSigned(netPnl, currency) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
                    {item.label}
                  </dt>
                  <dd className="tnum mt-1 text-[13.5px] font-semibold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
              Client since {formatDate(client.createdAt)} · last login {formatDate(client.lastLoginAt, true)}
            </p>
          </Card>

          <BalanceActions
            clientId={client.id}
            clientName={client.fullName}
            balance={balance}
            currency={currency}
          />

          <Card>
            <CardHeader title="Withdrawal requests" description={`${withdrawals.length} total`} />
            <ul className="divide-y divide-[var(--border)]">
              {withdrawals.slice(0, 5).map((row) => (
                <li key={row.id} className="flex items-center justify-between px-5 py-3">
                  <span>
                    <span className="tnum block text-[13.5px] font-semibold text-ink">
                      {formatCurrency(row.amount, currency)}
                    </span>
                    <span className="block text-[11.5px] text-ink-3">{formatDate(row.createdAt, true)}</span>
                  </span>
                  <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status}</Badge>
                </li>
              ))}
              {withdrawals.length === 0 ? (
                <li className="px-5 py-6 text-center text-[13px] text-ink-3">No requests yet.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Feedback history" description={`${threads.length} conversations`} />
            <ul className="divide-y divide-[var(--border)]">
              {threads.slice(0, 5).map((row) => (
                <li key={row.id} className="px-5 py-3">
                  <Link
                    href={`/trader/feedback/${row.id}`}
                    className="text-[13.5px] font-medium text-ink hover:underline"
                  >
                    {row.subject}
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    {row.category} · {row.status.replace("_", " ")} · {formatDate(row.createdAt)}
                  </p>
                </li>
              ))}
              {threads.length === 0 ? (
                <li className="px-5 py-6 text-center text-[13px] text-ink-3">No conversations yet.</li>
              ) : null}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <ChartCard title="Balance history" description="Last 90 days of closing balances">
            <AreaTrend
              data={buildBalanceSeries(ledger, balance, 90)}
              ariaLabel={`Balance history for ${client.fullName}`}
            />
          </ChartCard>

          <LedgerTable
            title="Full ledger"
            currency={currency}
            rows={ledger.map((row) => ({
              id: row.id,
              type: row.type,
              amount: row.amount,
              balanceBefore: row.balanceBefore,
              balanceAfter: row.balanceAfter,
              note: row.note,
              status: row.status,
              reference: row.reference,
              createdAt: row.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </>
  );
}
