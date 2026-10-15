import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import { ProfileForm } from "@/components/features/profile-form";
import { Card, CardHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { tradeStats } from "@/lib/analytics";
import { getTraderClients, getTraderTrades } from "@/lib/queries";
import { formatCurrency, formatSigned } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function TraderProfilePage() {
  const user = await requireRole("trader");
  const [clients, trades] = await Promise.all([getTraderClients(user.id), getTraderTrades(user.id)]);
  const stats = tradeStats(trades);
  const aum = clients.reduce((sum, client) => sum + client.balance, 0);

  return (
    <>
      <PageHeader title="Profile" description="Your details, security settings and performance summary." />
      <ProfileForm
        profile={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          role: user.role,
          theme: user.theme,
          emailNotifications: user.emailNotifications,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        }}
        summary={
          <Card>
            <CardHeader title="Performance summary" description="Visible to administrators" />
            <dl className="divide-y divide-[var(--border)]">
              {[
                { label: "Clients", value: String(clients.length) },
                { label: "AUM", value: formatCurrency(aum) },
                { label: "Trades logged", value: String(stats.total) },
                { label: "Win rate", value: `${stats.winRate.toFixed(1)}%` },
                { label: "Realised P&L", value: formatSigned(stats.netPnl) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{item.label}</dt>
                  <dd className="tnum text-[13px] font-semibold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        }
      />
    </>
  );
}
