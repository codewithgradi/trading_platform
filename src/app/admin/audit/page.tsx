import type { Metadata } from "next";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { AuditTable } from "@/components/features/audit-table";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole("admin");
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(400);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every financial action, credential change and content publish, with before and after values."
      />
      <AuditTable
        rows={rows.map((row) => ({
          id: row.id,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId,
          actorName: row.actorName,
          before: row.before ? JSON.stringify(row.before) : null,
          after: row.after ? JSON.stringify(row.after) : null,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
