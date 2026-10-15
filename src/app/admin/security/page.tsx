import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { AdminSecurity } from "@/components/features/admin-security";
import { PageHeader } from "@/components/features/portal-shell";
import { ProfileForm } from "@/components/features/profile-form";
import { Card, CardHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const user = await requireRole("admin");
  const active = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .orderBy(desc(sessions.createdAt))
    .limit(8);

  return (
    <>
      <PageHeader
        title="Account & security"
        description="Your credentials, active sessions and platform safeguards."
      />
      <div className="mb-4">
        <AdminSecurity currentEmail={user.email} twoFactorEnabled={user.twoFactorEnabled} />
      </div>

      <ProfileForm
        profile={{
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          role: user.role,
          theme: user.theme,
          emailNotifications: user.emailNotifications,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        }}
        summary={
          <Card>
            <CardHeader title="Active sessions" description={`${active.length} devices signed in`} />
            <ul className="divide-y divide-[var(--border)]">
              {active.map((session) => (
                <li key={session.id} className="px-5 py-3">
                  <p className="line-clamp-1 text-[12.5px] text-ink">{session.userAgent ?? "Unknown device"}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    Started {formatDate(session.createdAt, true)} · expires {formatDate(session.expiresAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        }
      />
    </>
  );
}
