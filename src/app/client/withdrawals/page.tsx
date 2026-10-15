import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import { WithdrawalsClient } from "@/components/features/withdrawals-client";
import { requireRole } from "@/lib/auth";
import { getAccount, getClientWithdrawals } from "@/lib/queries";

export const metadata: Metadata = { title: "Withdrawals" };

export default async function ClientWithdrawalsPage() {
  const user = await requireRole("client");
  const [account, rows] = await Promise.all([getAccount(user.id), getClientWithdrawals(user.id)]);

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Request a payout and follow it through review, approval and settlement."
      />
      <WithdrawalsClient
        balance={account?.balance ?? 0}
        currency={account?.currency ?? "USD"}
        rows={rows.map((row) => ({
          id: row.id,
          amount: row.amount,
          method: row.method,
          destination: row.destination,
          status: row.status,
          reason: row.reason,
          createdAt: row.createdAt.toISOString(),
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
          processedAt: row.processedAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
