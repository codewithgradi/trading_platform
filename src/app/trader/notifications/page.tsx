import type { Metadata } from "next";

import { NotificationsView } from "@/components/features/notifications-view";
import { requireRole } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function TraderNotificationsPage() {
  const user = await requireRole("trader");
  const rows = await getNotifications(user.id);

  return (
    <NotificationsView
      rows={rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
