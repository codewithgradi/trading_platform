import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { feedback, feedbackMessages, profiles } from "@/db/schema";
import { FeedbackThread } from "@/components/features/feedback-ui";
import { PageHeader } from "@/components/features/portal-shell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Conversation" };

export default async function ClientFeedbackThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("client");

  const [thread] = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
  if (!thread || thread.clientId !== user.id) notFound();

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
      <PageHeader title="Conversation" description="Your thread with the Meridian desk." />
      <FeedbackThread
        canModerate={false}
        thread={{
          id: thread.id,
          category: thread.category,
          subject: thread.subject,
          message: thread.message,
          status: thread.status,
          priority: thread.priority,
          createdAt: thread.createdAt.toISOString(),
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
