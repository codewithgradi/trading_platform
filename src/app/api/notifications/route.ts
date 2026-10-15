import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread: rows.filter((row) => !row.readAt).length,
  });
}
