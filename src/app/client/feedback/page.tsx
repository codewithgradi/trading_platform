import type { Metadata } from "next";
import { inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { feedbackMessages } from "@/db/schema";
import { FeedbackComposer, FeedbackList } from "@/components/features/feedback-ui";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";
import { getClientFeedback } from "@/lib/queries";

export const metadata: Metadata = { title: "Feedback" };

export default async function ClientFeedbackPage() {
  const user = await requireRole("client");
  const threads = await getClientFeedback(user.id);

  const counts = threads.length
    ? await db
        .select({ feedbackId: feedbackMessages.feedbackId, count: sql<number>`count(*)::int` })
        .from(feedbackMessages)
        .where(inArray(feedbackMessages.feedbackId, threads.map((row) => row.id)))
        .groupBy(feedbackMessages.feedbackId)
    : [];

  return (
    <>
      <PageHeader
        title="Feedback & concerns"
        description="Raise anything with the desk and follow the conversation through to resolution."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <FeedbackComposer />
        <FeedbackList
          basePath="/client/feedback"
          rows={threads.map((row) => ({
            id: row.id,
            category: row.category,
            subject: row.subject,
            message: row.message,
            status: row.status,
            priority: row.priority,
            createdAt: row.createdAt.toISOString(),
            replies: counts.find((c) => c.feedbackId === row.id)?.count ?? 0,
          }))}
        />
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
