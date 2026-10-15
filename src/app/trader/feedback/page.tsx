import type { Metadata } from "next";
import { inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { feedbackMessages } from "@/db/schema";
import { FeedbackList } from "@/components/features/feedback-ui";
import { PageHeader } from "@/components/features/portal-shell";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth";
import { getFeedbackForClients, getTraderClientIds } from "@/lib/queries";

export const metadata: Metadata = { title: "Feedback inbox" };
export const dynamic = "force-dynamic";

export default async function TraderFeedbackPage() {
  const user = await requireRole("trader");
  const clientIds = await getTraderClientIds(user.id);
  const threads = await getFeedbackForClients(clientIds);

  const counts = threads.length
    ? await db
        .select({ feedbackId: feedbackMessages.feedbackId, count: sql<number>`count(*)::int` })
        .from(feedbackMessages)
        .where(inArray(feedbackMessages.feedbackId, threads.map((row) => row.item.id)))
        .groupBy(feedbackMessages.feedbackId)
    : [];

  const open = threads.filter((row) => row.item.status === "open").length;
  const inReview = threads.filter((row) => row.item.status === "in_review").length;
  const resolved = threads.filter((row) => row.item.status === "resolved").length;
  const responded = threads.filter((row) => row.item.firstResponseAt);
  const avgResponseHours = responded.length
    ? responded.reduce(
        (sum, row) =>
          sum + (row.item.firstResponseAt!.getTime() - row.item.createdAt.getTime()) / 3_600_000,
        0,
      ) / responded.length
    : 0;

  return (
    <>
      <PageHeader
        title="Feedback inbox"
        description="Questions, concerns and complaints from the clients you manage."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={String(open)} tone={open ? "warning" : "default"} hint="Awaiting first reply" index={0} />
        <StatCard label="In review" value={String(inReview)} hint="You've replied, not resolved" index={1} />
        <StatCard label="Resolved" value={String(resolved)} tone="positive" hint="Closed conversations" index={2} />
        <StatCard
          label="Avg. response"
          value={avgResponseHours ? `${avgResponseHours.toFixed(1)}h` : "—"}
          hint="Time to first reply"
          index={3}
        />
      </div>

      <FeedbackList
        basePath="/trader/feedback"
        showClient
        rows={threads.map((row) => ({
          id: row.item.id,
          category: row.item.category,
          subject: row.item.subject,
          message: row.item.message,
          status: row.item.status,
          priority: row.item.priority,
          createdAt: row.item.createdAt.toISOString(),
          clientName: row.client.fullName,
          replies: counts.find((c) => c.feedbackId === row.item.id)?.count ?? 0,
        }))}
      />
    </>
  );
}
