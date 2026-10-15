import type { Metadata } from "next";

import { CustomersTable } from "@/components/features/customers-table";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";
import { getTraderClients, getTransactionsForClients } from "@/lib/queries";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function TraderCustomersPage() {
  const user = await requireRole("trader");
  const clients = await getTraderClients(user.id);
  const ledger = await getTransactionsForClients(clients.map((client) => client.id));

  const rows = clients.map((client) => {
    const entries = ledger.filter((row) => row.clientId === client.id);
    const last30 = entries
      .filter((row) => row.createdAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, row) => sum + row.amount, 0);
    const base = client.balance - last30;
    return {
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      status: client.status,
      balance: client.balance,
      currency: client.currency,
      deposited: client.totalDeposited,
      withdrawn: client.totalWithdrawn,
      change30: base > 0 ? (last30 / base) * 100 : 0,
      lastActivity: entries[0]?.createdAt.toISOString() ?? client.createdAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${clients.length} accounts assigned to you. Open a client to manage their balance and history.`}
      />
      <CustomersTable rows={rows} />
    </>
  );
}
