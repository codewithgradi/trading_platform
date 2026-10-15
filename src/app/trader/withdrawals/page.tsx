import type { Metadata } from "next";

import { PageHeader } from "@/components/features/portal-shell";
import { WithdrawalQueue } from "@/components/features/withdrawal-queue";
import { requireRole } from "@/lib/auth";
import { getTraderClientIds, getWithdrawalQueue } from "@/lib/queries";

export const metadata: Metadata = { title: "Withdrawals" };
export const dynamic = "force-dynamic";

export default async function TraderWithdrawalsPage() {
  const user = await requireRole("trader");
  const clientIds = await getTraderClientIds(user.id);
  const queue = await getWithdrawalQueue(clientIds);

  return (
    <>
      <PageHeader
        title="Withdrawal queue"
        description="Review, approve or reject payout requests from your clients."
      />
      <WithdrawalQueue
        rows={queue.map((row) => ({
          id: row.request.id,
          clientId: row.client.id,
          clientName: row.client.fullName,
          amount: row.request.amount,
          method: row.request.method,
          destination: row.request.destination,
          status: row.request.status,
          balance: row.balance ?? 0,
          reason: row.request.reason,
          createdAt: row.request.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
