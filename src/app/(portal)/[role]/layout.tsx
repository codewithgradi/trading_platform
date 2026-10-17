import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { DashboardShell } from "@/components/portal/dashboard-shell";

export const dynamic = "force-dynamic";
export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!["admin", "trader", "client"].includes(role)) notFound();
  const user = await requireRole(role as Role);
  const recent = await db.select({ id: notifications.id, userId: notifications.userId, type: notifications.type, title: notifications.title, body: notifications.body, data: notifications.data, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(10);
  const me = { id: user.id, role: user.role, fullName: user.fullName, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, theme: user.theme, onboardingCompleted: user.onboardingCompleted, status: user.status, notificationPreferences: user.notificationPreferences };
  return <DashboardShell role={role as Role} me={me} notifications={JSON.parse(JSON.stringify(recent))}>{children}</DashboardShell>;
}
