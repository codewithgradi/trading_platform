import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, profiles, traderClients } from "@/db/schema";
import { PageHeader } from "@/components/features/portal-shell";
import { UsersManager } from "@/components/features/users-manager";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("admin");

  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      status: profiles.status,
      createdAt: profiles.createdAt,
      lastLoginAt: profiles.lastLoginAt,
      balance: accounts.balance,
      traderId: traderClients.traderId,
    })
    .from(profiles)
    .leftJoin(accounts, eq(accounts.clientId, profiles.id))
    .leftJoin(traderClients, eq(traderClients.clientId, profiles.id))
    .orderBy(asc(profiles.role), asc(profiles.fullName));

  const traders = rows
    .filter((row) => row.role === "trader")
    .map((row) => ({ id: row.id, fullName: row.fullName }));

  return (
    <>
      <PageHeader
        title="People"
        description="Create accounts, assign books of business, suspend access and reset credentials."
      />
      <UsersManager
        traders={traders}
        users={rows.map((row) => ({
          id: row.id,
          fullName: row.fullName,
          email: row.email,
          role: row.role,
          status: row.status,
          balance: row.balance ?? null,
          traderId: row.traderId ?? null,
          traderName: traders.find((trader) => trader.id === row.traderId)?.fullName ?? null,
          createdAt: row.createdAt.toISOString(),
          lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
