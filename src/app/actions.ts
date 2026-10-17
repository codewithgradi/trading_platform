"use server";

import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import sanitizeHtml from "sanitize-html";
import { db } from "@/db";
import { accounts, auditLog, cmsDocuments, cmsVersions, contactSubmissions, customerNotes, faqs, feedback, feedbackMessages, notifications, profiles, teamMembers, testimonials, tradeAllocations, traderClients, trades, transactions, withdrawalRequests } from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/auth-core";
import { defaultContent } from "@/lib/content";
import { formatCurrency } from "@/lib/format";
import { allowRequest } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { balanceSchema, cmsKeySchema, contactSchema, createUserSchema, feedbackSchema, profileSchema, tradeSchema, withdrawalSchema } from "@/lib/validators";

const fail = (error: unknown): ActionResult => ({ ok: false, error: error instanceof Error ? error.message : "Something went wrong. Please try again." });
const ok = (message: string): ActionResult => ({ ok: true, message });
const money = (value: number) => (Math.round(value * 100) / 100).toFixed(2);
const clean = (value: string) => sanitizeHtml(value.trim(), { allowedTags: [], allowedAttributes: {} });
function refresh() { revalidatePath("/admin"); revalidatePath("/trader"); revalidatePath("/client"); }

async function canManageClient(actor: { id: string; role: string }, clientId: string) {
  if (actor.role === "admin") return true;
  if (actor.role !== "trader") return false;
  const [assignment] = await db.select().from(traderClients).where(and(eq(traderClients.traderId, actor.id), eq(traderClients.clientId, clientId))).limit(1);
  return Boolean(assignment);
}

export async function changeBalance(input: unknown): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["admin", "trader"].includes(actor.role)) throw new Error("You are not authorised to manage balances.");
    const parsed = balanceSchema.extend({ confirmation: balanceSchema.shape.note.optional() }).parse(input);
    const confirmation = (input as { confirmation?: string }).confirmation;
    if (confirmation !== "CONFIRM") throw new Error("Type CONFIRM to apply this balance change.");
    if ((parsed.type === "deposit" && parsed.direction !== "credit") || (parsed.type === "withdrawal" && parsed.direction !== "debit")) throw new Error("Choose the correct direction for this action.");
    if (!(await canManageClient(actor, parsed.clientId))) throw new Error("This customer is not assigned to you.");
    const delta = Math.round(parsed.amount * 100) * (parsed.direction === "debit" ? -1 : 1);
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: transactions.id }).from(transactions).where(eq(transactions.idempotencyKey, parsed.idempotencyKey)).limit(1);
      if (existing) return;
      const [account] = await tx.select().from(accounts).where(eq(accounts.clientId, parsed.clientId)).for("update").limit(1);
      if (!account) throw new Error("Customer account not found.");
      const before = Math.round(Number(account.balance) * 100);
      const after = before + delta;
      if (after < 0) throw new Error("This change would make the balance negative.");
      const beforeValue = money(before / 100);
      const afterValue = money(after / 100);
      const change = money(delta / 100);
      await tx.update(accounts).set({ balance: afterValue, updatedAt: new Date() }).where(eq(accounts.clientId, parsed.clientId));
      await tx.insert(transactions).values({ clientId: parsed.clientId, traderId: actor.id, type: parsed.type, amount: change, balanceBefore: beforeValue, balanceAfter: afterValue, note: clean(parsed.note), reference: parsed.reference ? clean(parsed.reference) : null, idempotencyKey: parsed.idempotencyKey });
      await tx.insert(notifications).values({ userId: parsed.clientId, type: "balance", title: "Your balance has changed", body: `${parsed.type.replaceAll("_", " ")} of ${formatCurrency(change)}. Previous balance ${formatCurrency(beforeValue)}; new balance ${formatCurrency(afterValue)}.`, data: { amount: change, before: beforeValue, after: afterValue } });
      await tx.insert(auditLog).values({ actorId: actor.id, action: `balance.${parsed.type}`, entity: "account", entityId: parsed.clientId, before: { balance: beforeValue }, after: { balance: afterValue, amount: change, note: clean(parsed.note) } });
    });
    refresh();
    return ok("Balance updated. The customer has been notified.");
  } catch (error) { return fail(error); }
}

export async function requestWithdrawal(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole("client");
    const parsed = withdrawalSchema.parse(input);
    await db.transaction(async (tx) => {
      const [account] = await tx.select().from(accounts).where(eq(accounts.clientId, actor.id)).for("update").limit(1);
      if (!account) throw new Error("Account not found.");
      const pending = await tx.select({ amount: withdrawalRequests.amount }).from(withdrawalRequests).where(and(eq(withdrawalRequests.clientId, actor.id), inArray(withdrawalRequests.status, ["pending", "approved"])));
      const reserved = pending.reduce((total, row) => total + Number(row.amount), 0);
      if (parsed.amount > Number(account.balance) - reserved) throw new Error("The requested amount exceeds your available balance.");
      const [assignment] = await tx.select().from(traderClients).where(eq(traderClients.clientId, actor.id)).limit(1);
      const [request] = await tx.insert(withdrawalRequests).values({ clientId: actor.id, amount: money(parsed.amount), note: parsed.note ? clean(parsed.note) : null }).returning();
      if (assignment) await tx.insert(notifications).values({ userId: assignment.traderId, type: "withdrawal", title: "New withdrawal request", body: `${actor.fullName} requested ${formatCurrency(parsed.amount)}.`, data: { requestId: request.id } });
      await tx.insert(auditLog).values({ actorId: actor.id, action: "withdrawal.requested", entity: "withdrawal", entityId: request.id, after: { amount: money(parsed.amount), status: "pending" } });
    });
    refresh(); return ok("Your withdrawal request has been sent for review.");
  } catch (error) { return fail(error); }
}

export async function reviewWithdrawal(input: { id: string; decision: "approved" | "rejected" | "processed"; reason?: string; confirmation?: string }): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["admin", "trader"].includes(actor.role)) throw new Error("Not authorised.");
    const requiredWord = input.decision === "processed" ? "PROCESS" : input.decision === "approved" ? "APPROVE" : "REJECT";
    if (input.confirmation !== requiredWord) throw new Error(`Type ${requiredWord} to confirm this withdrawal decision.`);
    const [request] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, input.id)).limit(1);
    if (!request || !(await canManageClient(actor, request.clientId))) throw new Error("Withdrawal request not found.");
    if (input.decision === "processed" ? request.status !== "approved" : request.status !== "pending") throw new Error("This request has already moved to another stage.");
    if (input.decision === "rejected" && (!input.reason || clean(input.reason).length < 3)) throw new Error("Provide a reason for the rejection.");
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, input.id)).for("update").limit(1);
      if (!locked || locked.status !== request.status) throw new Error("This request was updated by someone else. Refresh and try again.");
      if (input.decision === "processed") {
        const [account] = await tx.select().from(accounts).where(eq(accounts.clientId, request.clientId)).for("update").limit(1);
        if (!account || Number(account.balance) < Number(request.amount)) throw new Error("Insufficient balance to process this withdrawal.");
        const after = money(Number(account.balance) - Number(request.amount));
        await tx.update(accounts).set({ balance: after, updatedAt: new Date() }).where(eq(accounts.clientId, request.clientId));
        await tx.insert(transactions).values({ clientId: request.clientId, traderId: actor.id, type: "withdrawal", amount: money(-Number(request.amount)), balanceBefore: account.balance, balanceAfter: after, note: "Withdrawal request processed", reference: request.id, idempotencyKey: request.id });
        await tx.insert(notifications).values({ userId: request.clientId, type: "balance", title: "Withdrawal processed", body: `${formatCurrency(request.amount)} was withdrawn. Previous balance ${formatCurrency(account.balance)}; new balance ${formatCurrency(after)}.`, data: { amount: money(-Number(request.amount)), before: account.balance, after } });
      } else {
        await tx.insert(notifications).values({ userId: request.clientId, type: "withdrawal", title: `Withdrawal ${input.decision}`, body: `Your request for ${formatCurrency(request.amount)} was ${input.decision}.${input.reason ? ` ${clean(input.reason)}` : ""}`, data: { requestId: request.id } });
      }
      await tx.update(withdrawalRequests).set({ status: input.decision, reviewedBy: actor.id, reason: input.reason ? clean(input.reason) : null, reviewedAt: new Date(), processedAt: input.decision === "processed" ? new Date() : null }).where(eq(withdrawalRequests.id, input.id));
      await tx.insert(auditLog).values({ actorId: actor.id, action: `withdrawal.${input.decision}`, entity: "withdrawal", entityId: input.id, before: { status: request.status }, after: { status: input.decision, amount: request.amount, reason: input.reason } });
    });
    refresh(); return ok(`Withdrawal ${input.decision}.`);
  } catch (error) { return fail(error); }
}

export async function submitFeedback(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole("client");
    const parsed = feedbackSchema.parse(input);
    const [assignment] = await db.select().from(traderClients).where(eq(traderClients.clientId, actor.id)).limit(1);
    await db.transaction(async (tx) => {
      const [item] = await tx.insert(feedback).values({ clientId: actor.id, assignedTo: assignment?.traderId || null, category: parsed.category, subject: clean(parsed.subject), message: clean(parsed.message), attachmentUrl: parsed.attachmentUrl || null, priority: parsed.category === "concern" ? "high" : "normal" }).returning();
      if (assignment) await tx.insert(notifications).values({ userId: assignment.traderId, type: "feedback", title: "New client message", body: `${actor.fullName}: ${clean(parsed.subject)}`, data: { feedbackId: item.id } });
      await tx.insert(auditLog).values({ actorId: actor.id, action: "feedback.created", entity: "feedback", entityId: item.id, after: { category: parsed.category, subject: parsed.subject } });
    });
    refresh(); return ok("Your message has been sent. We will get back to you soon.");
  } catch (error) { return fail(error); }
}

export async function replyToFeedback(input: { id: string; body: string; status?: string }): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !input.body || clean(input.body).length < 2) throw new Error("Write a reply before sending.");
    const [item] = await db.select().from(feedback).where(eq(feedback.id, input.id)).limit(1);
    if (!item || (actor.role === "client" ? item.clientId !== actor.id : actor.role === "trader" && !(await canManageClient(actor, item.clientId)))) throw new Error("Conversation not found.");
    const status = ["open", "in_review", "resolved"].includes(input.status || "") && actor.role !== "client" ? input.status! : item.status === "open" ? "in_review" : item.status;
    await db.transaction(async (tx) => {
      await tx.insert(feedbackMessages).values({ feedbackId: item.id, authorId: actor.id, body: clean(input.body) });
      await tx.update(feedback).set({ status, updatedAt: new Date() }).where(eq(feedback.id, item.id));
      const recipient = actor.role === "client" ? item.assignedTo : item.clientId;
      if (recipient) await tx.insert(notifications).values({ userId: recipient, type: "feedback", title: "New reply to your conversation", body: `${actor.fullName} replied to “${item.subject}”.`, data: { feedbackId: item.id } });
      await tx.insert(auditLog).values({ actorId: actor.id, action: "feedback.replied", entity: "feedback", entityId: item.id, before: { status: item.status }, after: { status } });
    });
    refresh(); return ok("Reply sent.");
  } catch (error) { return fail(error); }
}

export async function logTrade(input: unknown): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["trader", "admin"].includes(actor.role)) throw new Error("Not authorised.");
    const parsed = tradeSchema.parse(input);
    await db.transaction(async (tx) => {
      const [trade] = await tx.insert(trades).values({ traderId: actor.id, instrument: clean(parsed.instrument), direction: parsed.direction, size: parsed.size.toFixed(4), entry: parsed.entry.toFixed(4), exit: parsed.exit?.toFixed(4), pnl: money(parsed.pnl), status: parsed.status, notes: parsed.notes ? clean(parsed.notes) : null, closedAt: parsed.status === "closed" ? new Date() : null }).returning();
      await tx.insert(auditLog).values({ actorId: actor.id, action: "trade.logged", entity: "trade", entityId: trade.id, after: { instrument: trade.instrument, pnl: trade.pnl, status: trade.status } });
    });
    refresh(); return ok("Trade recorded.");
  } catch (error) { return fail(error); }
}

export async function allocateTrade(input: { tradeId: string; allocations: { clientId: string; amount: number }[]; confirmation: string }): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["trader", "admin"].includes(actor.role)) throw new Error("Not authorised.");
    if (input.confirmation !== "ALLOCATE") throw new Error("Type ALLOCATE to apply this trade outcome.");
    const [trade] = await db.select().from(trades).where(eq(trades.id, input.tradeId)).limit(1);
    if (!trade || trade.status !== "closed" || (actor.role === "trader" && trade.traderId !== actor.id)) throw new Error("Closed trade not found.");
    if (!input.allocations.length || input.allocations.length > 100) throw new Error("Choose at least one customer.");
    if (new Set(input.allocations.map((a) => a.clientId)).size !== input.allocations.length) throw new Error("A customer is listed more than once.");
    const totalCents = input.allocations.reduce((total, a) => total + Math.round(a.amount * 100), 0);
    if (totalCents !== Math.round(Number(trade.pnl) * 100)) throw new Error("Allocations must add up to the trade outcome.");
    for (const item of input.allocations) {
      const [assignment] = await db.select({ clientId: traderClients.clientId }).from(traderClients).where(and(eq(traderClients.clientId, item.clientId), eq(traderClients.traderId, trade.traderId))).limit(1);
      if (!assignment || !(await canManageClient(actor, item.clientId)) || !Number.isFinite(item.amount)) throw new Error("Invalid customer allocation.");
    }
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(tradeAllocations).where(eq(tradeAllocations.tradeId, trade.id)).limit(1);
      if (existing) throw new Error("This trade has already been allocated.");
      for (const item of [...input.allocations].sort((a, b) => a.clientId.localeCompare(b.clientId))) {
        const [account] = await tx.select().from(accounts).where(eq(accounts.clientId, item.clientId)).for("update").limit(1);
        if (!account) throw new Error("A customer account could not be found.");
        const after = money(Number(account.balance) + item.amount);
        if (Number(after) < 0) throw new Error("An allocation would make a balance negative.");
        await tx.update(accounts).set({ balance: after, updatedAt: new Date() }).where(eq(accounts.clientId, item.clientId));
        await tx.insert(tradeAllocations).values({ tradeId: trade.id, clientId: item.clientId, amount: money(item.amount) });
        await tx.insert(transactions).values({ clientId: item.clientId, traderId: actor.id, type: "trade_outcome", amount: money(item.amount), balanceBefore: account.balance, balanceAfter: after, note: `Trade outcome · ${trade.instrument}`, reference: trade.id, idempotencyKey: randomUUID() });
        await tx.insert(notifications).values({ userId: item.clientId, type: "balance", title: "Trade outcome applied", body: `${formatCurrency(item.amount)} was applied to your account. Previous balance ${formatCurrency(account.balance)}; new balance ${formatCurrency(after)}.`, data: { before: account.balance, after, amount: money(item.amount) } });
        await tx.insert(auditLog).values({ actorId: actor.id, action: "trade.allocated", entity: "account", entityId: item.clientId, before: { balance: account.balance }, after: { balance: after, tradeId: trade.id, amount: money(item.amount) } });
      }
    });
    refresh(); return ok("Outcome allocated and customers notified.");
  } catch (error) { return fail(error); }
}

export async function markNotifications(ids?: string[]): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new Error("Please log in.");
    if (ids?.length) await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, actor.id), inArray(notifications.id, ids)));
    else await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.userId, actor.id));
    refresh(); return ok("Notifications marked as read.");
  } catch (error) { return fail(error); }
}

export async function updateMyProfile(input: unknown): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new Error("Please log in.");
    const parsed = profileSchema.parse(input);
    const avatarUrl = (input as { avatarUrl?: string }).avatarUrl;
    const emailNotifications = (input as { emailNotifications?: boolean }).emailNotifications;
    await db.transaction(async (tx) => {
      await tx.update(profiles).set({ fullName: clean(parsed.fullName), phone: clean(parsed.phone), theme: parsed.theme || actor.theme, avatarUrl: avatarUrl || actor.avatarUrl, notificationPreferences: { email: emailNotifications ?? true, inApp: true }, updatedAt: new Date() }).where(eq(profiles.id, actor.id));
      await tx.insert(auditLog).values({ actorId: actor.id, action: "profile.updated", entity: "profile", entityId: actor.id, before: { fullName: actor.fullName, phone: actor.phone }, after: { fullName: parsed.fullName, phone: parsed.phone } });
    });
    refresh(); return ok("Your profile has been updated.");
  } catch (error) { return fail(error); }
}

export async function changeMyPassword(input: { current: string; next: string; confirmation: string }): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new Error("Please log in.");
    if (input.confirmation !== "CHANGE" || input.next.length < 8) throw new Error("Enter a password of at least 8 characters and type CHANGE.");
    if (supabaseConfigured()) {
      const supabase = (await createSupabaseServerClient())!;
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: actor.email, password: input.current });
      if (verifyError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: input.next });
      if (error) throw error;
    } else {
      if (!actor.passwordHash || !(await compare(input.current, actor.passwordHash))) throw new Error("Current password is incorrect.");
      await db.update(profiles).set({ passwordHash: await hash(input.next, 12), updatedAt: new Date() }).where(eq(profiles.id, actor.id));
    }
    await db.insert(auditLog).values({ actorId: actor.id, action: "security.password_changed", entity: "profile", entityId: actor.id });
    return ok("Password changed successfully.");
  } catch (error) { return fail(error); }
}

export async function updateAdminEmail(input: { email: string; confirmation: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (input.confirmation !== "CHANGE" || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Enter a valid email and type CHANGE.");
    if (supabaseConfigured()) {
      const supabase = (await createSupabaseServerClient())!;
      const { error } = await supabase.auth.updateUser({ email: input.email });
      if (error) throw error;
    } else await db.update(profiles).set({ email: input.email.toLowerCase(), updatedAt: new Date() }).where(eq(profiles.id, actor.id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "security.email_change", entity: "profile", entityId: actor.id, before: { email: actor.email }, after: { requestedEmail: input.email } });
    refresh(); return ok(supabaseConfigured() ? "Verification emails have been sent. Confirm the change to finish." : "Email updated.");
  } catch (error) { return fail(error); }
}

export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new Error("Please log in.");
    await db.update(profiles).set({ onboardingCompleted: true }).where(eq(profiles.id, actor.id));
    refresh(); return ok("Guide completed.");
  } catch (error) { return fail(error); }
}

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    const parsed = createUserSchema.parse(input);
    const email = parsed.email.toLowerCase();
    const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing) throw new Error("An account with this email already exists.");
    let id: string = randomUUID();
    if (supabaseConfigured()) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Configure the Supabase service role key to invite users.");
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data, error } = await admin.auth.admin.createUser({ email, password: parsed.password, email_confirm: true, user_metadata: { full_name: parsed.fullName } });
      if (error || !data.user) throw new Error(error?.message || "Could not create the account.");
      id = data.user.id;
    }
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({ id, role: parsed.role, fullName: clean(parsed.fullName), email, passwordHash: supabaseConfigured() ? null : await hash(parsed.password, 12) });
      if (parsed.role === "client") {
        await tx.insert(accounts).values({ clientId: id, balance: "0.00" });
        if (parsed.traderId) await tx.insert(traderClients).values({ clientId: id, traderId: parsed.traderId });
      }
      await tx.insert(auditLog).values({ actorId: actor.id, action: "user.created", entity: "profile", entityId: id, after: { role: parsed.role, email } });
    });
    refresh(); return ok(`${parsed.role === "trader" ? "Trader" : "Client"} account created. Share the temporary password securely.`);
  } catch (error) { return fail(error); }
}

export async function editUser(input: { id: string; fullName: string; email: string; phone: string; confirmation: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (input.confirmation !== "CHANGE") throw new Error("Type CHANGE to update this account.");
    if (input.fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Enter a valid name and email address.");
    const [target] = await db.select().from(profiles).where(eq(profiles.id, input.id)).limit(1);
    if (!target || target.role === "admin") throw new Error("This account cannot be edited here.");
    const email = input.email.trim().toLowerCase();
    if (supabaseConfigured() && email !== target.email) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Service role key is required.");
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { error } = await admin.auth.admin.updateUserById(target.id, { email, email_confirm: true });
      if (error) throw error;
    }
    await db.transaction(async (tx) => {
      await tx.update(profiles).set({ fullName: clean(input.fullName), email, phone: clean(input.phone), updatedAt: new Date() }).where(eq(profiles.id, target.id));
      await tx.insert(auditLog).values({ actorId: actor.id, action: "user.edited", entity: "profile", entityId: target.id, before: { fullName: target.fullName, email: target.email, phone: target.phone }, after: { fullName: input.fullName, email, phone: input.phone } });
    });
    refresh(); return ok("Account details updated.");
  } catch (error) { return fail(error); }
}

export async function manageUser(input: { id: string; action: "suspend" | "reactivate" | "archive" | "delete" | "reset_password"; confirmation: string; password?: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (input.confirmation !== "CONFIRM") throw new Error("Type CONFIRM to continue.");
    const [target] = await db.select().from(profiles).where(eq(profiles.id, input.id)).limit(1);
    if (!target || target.id === actor.id || target.role === "admin") throw new Error("This account cannot be changed.");
    if (input.action === "reset_password") {
      if (!input.password || input.password.length < 8) throw new Error("Enter a temporary password of at least 8 characters.");
      if (supabaseConfigured()) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Service role key is required.");
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await admin.auth.admin.updateUserById(target.id, { password: input.password });
        if (error) throw error;
      } else await db.update(profiles).set({ passwordHash: await hash(input.password, 12) }).where(eq(profiles.id, target.id));
    } else if (input.action === "delete") {
      if (target.role === "client" && (await db.select().from(transactions).where(eq(transactions.clientId, target.id)).limit(1)).length) throw new Error("Keep financial records. Archive this account instead of deleting it.");
      if (supabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
        await admin.auth.admin.deleteUser(target.id);
      }
      await db.delete(profiles).where(eq(profiles.id, target.id));
    } else await db.update(profiles).set({ status: input.action === "reactivate" ? "active" : input.action === "archive" ? "archived" : "suspended", updatedAt: new Date() }).where(eq(profiles.id, target.id));
    await db.insert(auditLog).values({ actorId: actor.id, action: `user.${input.action}`, entity: "profile", entityId: target.id, before: { status: target.status }, after: { status: input.action === "reset_password" ? target.status : input.action } });
    refresh(); return ok(`Account ${input.action.replace("_", " ")} completed.`);
  } catch (error) { return fail(error); }
}

export async function assignClient(input: { clientId: string; traderId: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    const [client] = await db.select().from(profiles).where(eq(profiles.id, input.clientId)).limit(1);
    const [trader] = await db.select().from(profiles).where(eq(profiles.id, input.traderId)).limit(1);
    if (client?.role !== "client" || trader?.role !== "trader") throw new Error("Choose a client and an active trader.");
    const [previous] = await db.select().from(traderClients).where(eq(traderClients.clientId, input.clientId)).limit(1);
    await db.insert(traderClients).values({ clientId: input.clientId, traderId: input.traderId }).onConflictDoUpdate({ target: traderClients.clientId, set: { traderId: input.traderId, assignedAt: new Date() } });
    await db.insert(auditLog).values({ actorId: actor.id, action: "client.assigned", entity: "profile", entityId: input.clientId, before: { traderId: previous?.traderId }, after: { traderId: input.traderId } });
    refresh(); return ok("Client assignment updated.");
  } catch (error) { return fail(error); }
}

export async function addCustomerNote(input: { clientId: string; body: string }): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || !["trader", "admin"].includes(actor.role)) throw new Error("Not authorised.");
    if (!(await canManageClient(actor, input.clientId))) throw new Error("This customer is not assigned to you.");
    if (!input.body || clean(input.body).length < 3) throw new Error("Write a note of at least three characters.");
    await db.transaction(async (tx) => {
      await tx.insert(customerNotes).values({ clientId: input.clientId, traderId: actor.id, body: clean(input.body) });
      await tx.insert(auditLog).values({ actorId: actor.id, action: "customer.note_added", entity: "profile", entityId: input.clientId, after: { body: clean(input.body) } });
    });
    refresh(); return ok("Note saved.");
  } catch (error) { return fail(error); }
}

function sanitiseDocument(value: unknown): unknown {
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) return value.map(sanitiseDocument);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitiseDocument(item)]));
  return value;
}
export async function saveCmsDraft(key: string, value: Record<string, unknown>): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    const validKey = cmsKeySchema.parse(key);
    const draft = sanitiseDocument(value) as Record<string, unknown>;
    if (JSON.stringify(draft).length > 50000) throw new Error("This section is too large.");
    const fallback = defaultContent[validKey] as Record<string, unknown>;
    await db.insert(cmsDocuments).values({ key: validKey, published: fallback, draft, updatedBy: actor.id }).onConflictDoUpdate({ target: cmsDocuments.key, set: { draft, updatedBy: actor.id, updatedAt: new Date() } });
    await db.insert(auditLog).values({ actorId: actor.id, action: "cms.draft_saved", entity: "cms", entityId: validKey, after: { key: validKey } });
    revalidatePath("/admin/cms"); return ok("Draft saved. The public site is unchanged.");
  } catch (error) { return fail(error); }
}
export async function publishCms(key: string, confirmation: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    const validKey = cmsKeySchema.parse(key);
    if (confirmation !== "PUBLISH") throw new Error("Type PUBLISH to make this content live.");
    const [doc] = await db.select().from(cmsDocuments).where(eq(cmsDocuments.key, validKey)).limit(1);
    if (!doc) throw new Error("Save a draft before publishing.");
    await db.transaction(async (tx) => {
      await tx.insert(cmsVersions).values({ key: validKey, version: doc.version, published: doc.published, updatedBy: actor.id });
      await tx.update(cmsDocuments).set({ published: doc.draft, version: doc.version + 1, publishedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id }).where(eq(cmsDocuments.key, validKey));
      await tx.insert(auditLog).values({ actorId: actor.id, action: "cms.published", entity: "cms", entityId: validKey, before: { version: doc.version, content: doc.published }, after: { version: doc.version + 1, content: doc.draft } });
    });
    revalidatePath("/"); revalidatePath("/legal/[slug]", "page"); revalidatePath("/admin/cms"); return ok("Published. The public site is now up to date.");
  } catch (error) { return fail(error); }
}
export async function restoreCmsVersion(key: string, versionId: string, confirmation: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    const validKey = cmsKeySchema.parse(key);
    if (confirmation !== "RESTORE") throw new Error("Type RESTORE to confirm.");
    const [previous] = await db.select().from(cmsVersions).where(eq(cmsVersions.id, versionId)).limit(1);
    if (!previous || previous.key !== validKey) throw new Error("Version not found.");
    const [doc] = await db.select().from(cmsDocuments).where(eq(cmsDocuments.key, validKey)).limit(1);
    if (!doc) throw new Error("Document not found.");
    await db.transaction(async (tx) => {
      await tx.insert(cmsVersions).values({ key: validKey, version: doc.version, published: doc.published, updatedBy: actor.id });
      await tx.update(cmsDocuments).set({ published: previous.published, draft: previous.published, version: doc.version + 1, updatedAt: new Date(), publishedAt: new Date(), updatedBy: actor.id }).where(eq(cmsDocuments.key, validKey));
      await tx.insert(auditLog).values({ actorId: actor.id, action: "cms.restored", entity: "cms", entityId: validKey, before: { version: doc.version }, after: { version: doc.version + 1, restoredFrom: previous.version } });
    });
    revalidatePath("/"); revalidatePath("/admin/cms"); return ok("Previous version restored and published.");
  } catch (error) { return fail(error); }
}

export async function saveFaq(input: { id?: string; question: string; answer: string; status: string; sortOrder: number }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (input.question.trim().length < 5 || input.answer.trim().length < 5) throw new Error("Enter a question and an answer.");
    const values = { question: clean(input.question), answer: clean(input.answer), status: input.status === "draft" ? "draft" : "published", sortOrder: input.sortOrder, updatedBy: actor.id, updatedAt: new Date() };
    if (input.id) await db.update(faqs).set(values).where(eq(faqs.id, input.id));
    else await db.insert(faqs).values(values);
    await db.insert(auditLog).values({ actorId: actor.id, action: "cms.faq_saved", entity: "faq", entityId: input.id || "new", after: { question: values.question, status: values.status } });
    revalidatePath("/"); revalidatePath("/admin/cms"); return ok("FAQ saved.");
  } catch (error) { return fail(error); }
}
export async function saveTestimonial(input: { id?: string; quote: string; name: string; role: string; rating: number; status: string; sortOrder: number; avatarUrl?: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (input.quote.trim().length < 10 || !input.name.trim() || input.rating < 1 || input.rating > 5) throw new Error("Enter a quote, name and rating from 1 to 5.");
    const values = { quote: clean(input.quote), name: clean(input.name), role: clean(input.role), rating: input.rating, status: input.status === "draft" ? "draft" : "published", sortOrder: input.sortOrder, avatarUrl: input.avatarUrl || null, updatedBy: actor.id, updatedAt: new Date() };
    if (input.id) await db.update(testimonials).set(values).where(eq(testimonials.id, input.id));
    else await db.insert(testimonials).values(values);
    await db.insert(auditLog).values({ actorId: actor.id, action: "cms.testimonial_saved", entity: "testimonial", entityId: input.id || "new", after: { name: values.name, status: values.status } });
    revalidatePath("/"); revalidatePath("/admin/cms"); return ok("Testimonial saved.");
  } catch (error) { return fail(error); }
}
export async function saveTeamMember(input: { id?: string; name: string; role: string; bio: string; status: string; sortOrder: number; avatarUrl?: string }): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (!input.name.trim() || !input.role.trim()) throw new Error("Add a name and role for this team member.");
    const values = { name: clean(input.name), role: clean(input.role), bio: clean(input.bio || ""), status: input.status === "draft" ? "draft" : "published", sortOrder: input.sortOrder, avatarUrl: input.avatarUrl || null, updatedBy: actor.id, updatedAt: new Date() };
    if (input.id) await db.update(teamMembers).set(values).where(eq(teamMembers.id, input.id));
    else await db.insert(teamMembers).values(values);
    await db.insert(auditLog).values({ actorId: actor.id, action: "cms.team_saved", entity: "team_member", entityId: input.id || "new", after: { name: values.name, status: values.status } });
    revalidatePath("/"); revalidatePath("/admin/cms"); return ok("Team member saved.");
  } catch (error) { return fail(error); }
}
export async function deleteCmsItem(kind: "faq" | "testimonial" | "team", id: string, confirmation: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    if (confirmation !== "DELETE") throw new Error("Type DELETE to remove this item.");
    if (kind === "faq") await db.delete(faqs).where(eq(faqs.id, id));
    else if (kind === "testimonial") await db.delete(testimonials).where(eq(testimonials.id, id));
    else await db.delete(teamMembers).where(eq(teamMembers.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: `cms.${kind}_deleted`, entity: kind, entityId: id });
    revalidatePath("/"); revalidatePath("/admin/cms"); return ok("Item removed.");
  } catch (error) { return fail(error); }
}

export async function sendContact(input: unknown): Promise<ActionResult> {
  try {
    const parsed = contactSchema.parse(input);
    const address = (await headers()).get("x-forwarded-for")?.split(",")[0] || "local";
    if (!allowRequest(`contact:${address}`, 5, 60 * 60 * 1000)) throw new Error("Too many messages. Please try again later.");
    await db.insert(contactSubmissions).values({ name: clean(parsed.name), email: parsed.email.toLowerCase(), phone: parsed.phone ? clean(parsed.phone) : null, message: clean(parsed.message) });
    revalidatePath("/admin/contact"); return ok("Thank you. We have received your message and will be in touch shortly.");
  } catch (error) { return fail(error); }
}
export async function markContact(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("admin");
    await db.update(contactSubmissions).set({ status: "responded" }).where(eq(contactSubmissions.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "contact.responded", entity: "contact", entityId: id });
    revalidatePath("/admin/contact"); return ok("Conversation marked as responded.");
  } catch (error) { return fail(error); }
}
