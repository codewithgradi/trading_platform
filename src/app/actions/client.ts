"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { accounts, feedback, withdrawalRequests } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { fail, ok, zodErrors, type ActionState } from "@/lib/action-state";
import { getAssignedTrader, notifyUser, recordAudit } from "@/lib/ledger";
import { formatCurrency } from "@/lib/utils";
import { feedbackSchema, withdrawalRequestSchema } from "@/lib/validators";

export async function requestWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("client");

  const parsed = withdrawalRequestSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    destination: String(formData.get("destination") ?? "").trim(),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const [account] = await db.select().from(accounts).where(eq(accounts.clientId, user.id)).limit(1);
  if (!account) return fail("Your trading account is not active yet.");
  if (parsed.data.amount > account.balance) {
    return fail(
      `You can request up to ${formatCurrency(account.balance, account.currency)} right now.`,
      { amount: "Amount exceeds your available balance" },
    );
  }

  const [request] = await db
    .insert(withdrawalRequests)
    .values({
      clientId: user.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      destination: parsed.data.destination,
      status: "pending",
    })
    .returning();

  const assignment = await getAssignedTrader(user.id);
  if (assignment) {
    await notifyUser({
      userId: assignment.trader.id,
      type: "withdrawal",
      title: `New withdrawal request · ${formatCurrency(parsed.data.amount, account.currency)}`,
      body: `${user.fullName} requested a withdrawal to ${parsed.data.destination}. Review it in your queue.`,
      data: { requestId: request.id },
    });
  }

  await recordAudit({
    actor: user,
    action: "withdrawal.request",
    entity: "withdrawal_requests",
    entityId: request.id,
    after: { amount: parsed.data.amount, method: parsed.data.method },
  });

  revalidatePath("/client/withdrawals");
  revalidatePath("/client");
  return ok("Withdrawal request submitted. You'll be notified at each stage.");
}

export async function submitFeedbackAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("client");

  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    subject: String(formData.get("subject") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const assignment = await getAssignedTrader(user.id);

  const [thread] = await db
    .insert(feedback)
    .values({
      clientId: user.id,
      assignedTo: assignment?.trader.id ?? null,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.category === "complaint" ? "high" : "normal",
    })
    .returning();

  if (assignment) {
    await notifyUser({
      userId: assignment.trader.id,
      type: "feedback",
      title: `New ${parsed.data.category} from ${user.fullName}`,
      body: parsed.data.subject,
      data: { feedbackId: thread.id },
    });
  }

  revalidatePath("/client/feedback");
  return ok("Thanks — your message is with the desk.", { id: thread.id });
}
