import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { feedback, feedbackMessages, profiles, traderClients } from "@/db/schema";
import { FeedbackThread } from "@/components/features/feedback-ui";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function TraderFeedbackThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("trader");

  const [thread] = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
  if (!thread) notFound();

  const [link] = await db
    .select()
    .from(traderClients)
    .where(and(eq(traderClients.traderId, user.id), eq(traderClients.clientId, thread.clientId)))
    .limit(1);
  if (!link) notFound();

  const [client] = await db.select().from(profiles).where(eq(profiles.id, thread.clientId)).limit(1);

  const messages = await db
    .select({
      id: feedbackMessages.id,
      body: feedbackMessages.body,
      createdAt: feedbackMessages.createdAt,
      authorName: profiles.fullName,
      authorRole: profiles.role,
    })
    .from(feedbackMessages)
    .innerJoin(profiles, eq(profiles.id, feedbackMessages.authorId))
    .where(eq(feedbackMessages.feedbackId, id))
    .orderBy(asc(feedbackMessages.createdAt));

  return (
    <>
      <PageHeader title="Conversation" description={`Thread with ${client?.fullName ?? "your client"}.`} />
      <FeedbackThread
        canModerate
        thread={{
          id: thread.id,
          category: thread.category,
          subject: thread.subject,
          message: thread.message,
          status: thread.status,
          priority: thread.priority,
          createdAt: thread.createdAt.toISOString(),
          clientName: client?.fullName,
          replies: messages.length,
        }}
        messages={messages.map((message) => ({
          id: message.id,
          body: message.body,
          authorName: message.authorName,
          authorRole: message.authorRole,
          createdAt: message.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
