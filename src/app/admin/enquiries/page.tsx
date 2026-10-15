import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { contactSubmissions, feedback, profiles } from "@/db/schema";
import { PageHeader } from "@/components/features/portal-shell";
import { Badge, Card, CardHeader, EmptyState, statusTone } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };
export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  await requireRole("admin");

  const [submissions, threads] = await Promise.all([
    db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(50),
    db
      .select({ item: feedback, clientName: profiles.fullName })
      .from(feedback)
      .innerJoin(profiles, eq(profiles.id, feedback.clientId))
      .orderBy(desc(feedback.createdAt))
      .limit(50),
  ]);

  const escalated = threads.filter(
    (row) => row.item.priority === "high" || row.item.status === "open",
  );

  return (
    <>
      <PageHeader
        title="Enquiries & escalations"
        description="Website contact submissions and every client conversation across the platform."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Website enquiries" description={`${submissions.length} submissions`} />
          {submissions.length === 0 ? (
            <EmptyState title="No enquiries yet" description="Messages from the public contact form land here." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {submissions.map((row) => (
                <li key={row.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold tracking-tight text-ink">{row.name}</p>
                    <Badge tone={row.status === "new" ? "warning" : "neutral"}>{row.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {row.email}
                    {row.company ? ` · ${row.company}` : ""} · {timeAgo(row.createdAt)}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{row.message}</p>
                  <a
                    href={`mailto:${row.email}`}
                    className="mt-2 inline-block text-[12.5px] font-medium text-ink underline-offset-2 hover:underline"
                  >
                    Reply by email
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Escalations"
              description="High priority or unanswered client conversations"
            />
            {escalated.length === 0 ? (
              <EmptyState title="Nothing escalated" description="Every conversation has been picked up." />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {escalated.map((row) => (
                  <li key={row.item.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-ink">{row.item.subject}</p>
                      <Badge tone={statusTone[row.item.status] ?? "neutral"}>
                        {row.item.status.replace("_", " ")}
                      </Badge>
                      {row.item.priority === "high" ? <Badge tone="negative">high</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {row.clientName} · {row.item.category} · opened {formatDate(row.item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="All conversations" description={`${threads.length} total across the platform`} />
            <ul className="divide-y divide-[var(--border)]">
              {threads.slice(0, 12).map((row) => (
                <li key={row.item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">{row.item.subject}</span>
                    <span className="block text-[11.5px] text-ink-3">
                      {row.clientName} · {timeAgo(row.item.createdAt)}
                    </span>
                  </span>
                  <Badge tone={statusTone[row.item.status] ?? "neutral"}>
                    {row.item.status.replace("_", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-3">
              <Link
                href="/admin/users"
                className="text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                Manage people and assignments
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
