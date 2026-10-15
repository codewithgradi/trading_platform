"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { feedback, feedbackMessages, profiles, traderClients } from "@/db/schema";
import { assertRole, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { fail, ok, zodErrors, type ActionState } from "@/lib/action-state";
import { notifyUser, recordAudit } from "@/lib/ledger";
import { feedbackReplySchema, passwordSchema, profileSchema } from "@/lib/validators";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");

  const parsed = profileSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    avatarUrl: String(formData.get("avatarUrl") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    emailNotifications: formData.get("emailNotifications") === "on",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  await db
    .update(profiles)
    .set({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null,
      emailNotifications: parsed.data.emailNotifications,
    })
    .where(eq(profiles.id, user.id));

  await recordAudit({
    actor: user,
    action: "profile.update",
    entity: "profiles",
    entityId: user.id,
    before: { fullName: user.fullName, phone: user.phone },
    after: { fullName: parsed.data.fullName, phone: parsed.data.phone },
  });

  revalidatePath(`/${user.role}/profile`);
  return ok("Profile updated.");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");

  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return fail("Your current password is incorrect.", { currentPassword: "Incorrect password" });
  }

  await db
    .update(profiles)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
    .where(eq(profiles.id, user.id));

  await recordAudit({ actor: user, action: "auth.password_change", entity: "profiles", entityId: user.id });
  return ok("Password changed. Use it next time you sign in.");
}

export async function replyToFeedbackAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");

  const parsed = feedbackReplySchema.safeParse({
    feedbackId: String(formData.get("feedbackId") ?? ""),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) return fail("Write a reply before sending.", zodErrors(parsed.error));

  const [thread] = await db.select().from(feedback).where(eq(feedback.id, parsed.data.feedbackId)).limit(1);
  if (!thread) return fail("That conversation no longer exists.");

  if (user.role === "client" && thread.clientId !== user.id) return fail("You cannot reply to that thread.");
  if (user.role === "trader") {
    const [link] = await db
      .select()
      .from(traderClients)
      .where(and(eq(traderClients.traderId, user.id), eq(traderClients.clientId, thread.clientId)))
      .limit(1);
    if (!link) return fail("That client is not assigned to you.");
  }

  await db.insert(feedbackMessages).values({
    feedbackId: thread.id,
    authorId: user.id,
    body: parsed.data.body,
  });

  await db
    .update(feedback)
    .set({
      updatedAt: new Date(),
      status: user.role === "client" ? thread.status : thread.status === "open" ? "in_review" : thread.status,
      firstResponseAt: thread.firstResponseAt ?? (user.role === "client" ? null : new Date()),
    })
    .where(eq(feedback.id, thread.id));

  const recipient = user.role === "client" ? thread.assignedTo : thread.clientId;
  if (recipient) {
    await notifyUser({
      userId: recipient,
      type: "feedback",
      title: `New reply · ${thread.subject}`,
      body: `${user.fullName} replied to the conversation "${thread.subject}".`,
      data: { feedbackId: thread.id },
    });
  }

  revalidatePath(`/${user.role}/feedback/${thread.id}`);
  revalidatePath(`/${user.role}/feedback`);
  return ok("Reply sent.");
}

export async function setFeedbackStatusAction(
  feedbackId: string,
  status: "open" | "in_review" | "resolved",
  priority?: "low" | "normal" | "high",
): Promise<ActionState> {
  const user = await assertRole("trader", "admin");
  const [thread] = await db.select().from(feedback).where(eq(feedback.id, feedbackId)).limit(1);
  if (!thread) return fail("That conversation no longer exists.");

  await db
    .update(feedback)
    .set({ status, priority: priority ?? thread.priority, updatedAt: new Date() })
    .where(eq(feedback.id, feedbackId));

  await recordAudit({
    actor: user,
    action: "feedback.status",
    entity: "feedback",
    entityId: feedbackId,
    before: { status: thread.status, priority: thread.priority },
    after: { status, priority: priority ?? thread.priority },
  });

  if (status === "resolved") {
    await notifyUser({
      userId: thread.clientId,
      type: "feedback",
      title: `Resolved · ${thread.subject}`,
      body: "Your conversation has been marked as resolved. Reply in the thread if you need anything else.",
      data: { feedbackId },
    });
  }

  revalidatePath(`/${user.role}/feedback`);
  revalidatePath(`/${user.role}/feedback/${feedbackId}`);
  return ok(`Conversation marked ${status.replace("_", " ")}.`);
}
