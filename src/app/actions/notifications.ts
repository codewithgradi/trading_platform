"use server";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
}
