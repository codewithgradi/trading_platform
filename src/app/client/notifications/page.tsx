import type { Metadata } from "next";

import { NotificationsView } from "@/components/features/notifications-view";
import { requireRole } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";

export const metadata: Metadata = { title: "Notifications" };

export default async function ClientNotificationsPage() {
  const user = await requireRole("client");
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
