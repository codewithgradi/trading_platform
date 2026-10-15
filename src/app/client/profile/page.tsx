import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import { ProfileForm } from "@/components/features/profile-form";
import { Card, CardHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { getAssignedTrader } from "@/lib/ledger";
import { getAccount } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ClientProfilePage() {
  const user = await requireRole("client");
  const [account, assignment] = await Promise.all([getAccount(user.id), getAssignedTrader(user.id)]);

  return (
    <>
      <PageHeader title="Profile" description="Your details, security and portal preferences." />
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
            <CardHeader title="Account summary" />
            <dl className="divide-y divide-[var(--border)]">
              {[
                { label: "Balance", value: formatCurrency(account?.balance ?? 0, account?.currency ?? "USD") },
                { label: "Currency", value: account?.currency ?? "USD" },
                { label: "Assigned trader", value: assignment?.trader.fullName ?? "Pending" },
                { label: "Client since", value: formatDate(user.createdAt) },
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
