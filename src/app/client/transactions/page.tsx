import type { Metadata } from "next";

import { LedgerTable } from "@/components/features/ledger-table";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";
import { getAccount, getClientTransactions } from "@/lib/queries";

export const metadata: Metadata = { title: "Transactions" };

export default async function ClientTransactionsPage() {
  const user = await requireRole("client");
  const [account, ledger] = await Promise.all([getAccount(user.id), getClientTransactions(user.id)]);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every movement on your account, with the balance before and after each entry."
      />
      <LedgerTable
        currency={account?.currency ?? "USD"}
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
    </>
  );
}
