"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { accounts, contactSubmissions, profiles, traderClients } from "@/db/schema";
import { assertRole, hashPassword, verifyPassword } from "@/lib/auth";
import { fail, ok, zodErrors, type ActionState } from "@/lib/action-state";
import { applyBalanceChange, notifyUser, recordAudit } from "@/lib/ledger";
import { createUserSchema } from "@/lib/validators";

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertRole("admin");

  const parsed = createUserSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
    phone: String(formData.get("phone") ?? "").trim(),
    temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
    traderId: String(formData.get("traderId") ?? ""),
    openingBalance: formData.get("openingBalance") || 0,
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, parsed.data.email))
    .limit(1);
  if (existing) return fail("An account with that email already exists.", { email: "Email already in use" });

  const [created] = await db
    .insert(profiles)
    .values({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.temporaryPassword),
      mustChangePassword: true,
    })
    .returning();

  if (parsed.data.role === "client") {
    await db.insert(accounts).values({ clientId: created.id, balance: 0, currency: "USD" });
    if (parsed.data.traderId) {
      await db.insert(traderClients).values({ traderId: parsed.data.traderId, clientId: created.id });
    }
    if (parsed.data.openingBalance > 0) {
      await applyBalanceChange({
        clientId: created.id,
        traderId: parsed.data.traderId || null,
        type: "deposit",
        delta: parsed.data.openingBalance,
        note: "Opening balance recorded at onboarding",
        idempotencyKey: `opening-${created.id}`,
        actor: admin,
        silent: true,
      });
    }
  }

  await notifyUser({
    userId: created.id,
    type: "system",
    title: "Welcome to Meridian",
    body: "Your portal account is ready. Please change your temporary password from the Profile page.",
  });

  await recordAudit({
    actor: admin,
    action: "user.create",
    entity: "profiles",
    entityId: created.id,
    after: { email: created.email, role: created.role },
  });

  revalidatePath("/admin/users");
  return ok(`${created.fullName} can now sign in with the temporary password.`);
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended"): Promise<ActionState> {
  const admin = await assertRole("admin");
  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!user) return fail("User not found.");
  if (user.id === admin.id) return fail("You cannot suspend your own account.");

  await db.update(profiles).set({ status }).where(eq(profiles.id, userId));
  await recordAudit({
    actor: admin,
    action: `user.${status === "active" ? "reactivate" : "suspend"}`,
    entity: "profiles",
    entityId: userId,
    before: { status: user.status },
    after: { status },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return ok(status === "active" ? "Account reactivated." : "Account suspended.");
}

export async function deleteUserAction(userId: string): Promise<ActionState> {
  const admin = await assertRole("admin");
  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!user) return fail("User not found.");
  if (user.id === admin.id) return fail("You cannot delete your own account.");

  await db.delete(profiles).where(eq(profiles.id, userId));
  await recordAudit({
    actor: admin,
    action: "user.delete",
    entity: "profiles",
    entityId: userId,
    before: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
  return ok(`${user.fullName} was permanently deleted.`);
}

export async function assignClientAction(clientId: string, traderId: string): Promise<ActionState> {
  const admin = await assertRole("admin");
  const [client] = await db.select().from(profiles).where(eq(profiles.id, clientId)).limit(1);
  if (!client || client.role !== "client") return fail("Client not found.");

  const existing = await db.select().from(traderClients).where(eq(traderClients.clientId, clientId));
  await db.delete(traderClients).where(eq(traderClients.clientId, clientId));
  if (traderId) {
    await db.insert(traderClients).values({ traderId, clientId });
    await notifyUser({
      userId: traderId,
      type: "system",
      title: "New client assigned",
      body: `${client.fullName} has been assigned to your book.`,
      data: { clientId },
    });
  }

  await recordAudit({
    actor: admin,
    action: "user.assign",
    entity: "trader_clients",
    entityId: clientId,
    before: { traderId: existing[0]?.traderId ?? null },
    after: { traderId: traderId || null },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${clientId}`);
  return ok(traderId ? "Client reassigned." : "Client unassigned.");
}

export async function resetUserPasswordAction(
  userId: string,
  temporaryPassword: string,
): Promise<ActionState> {
  const admin = await assertRole("admin");
  if (temporaryPassword.length < 8) return fail("Temporary password needs at least 8 characters.");

  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!user) return fail("User not found.");

  await db
    .update(profiles)
    .set({ passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true })
    .where(eq(profiles.id, userId));

  await notifyUser({
    userId,
    type: "system",
    title: "Your password was reset",
    body: "An administrator issued a temporary password. Change it from your Profile page after signing in.",
  });

  await recordAudit({ actor: admin, action: "user.password_reset", entity: "profiles", entityId: userId });
  revalidatePath(`/admin/users/${userId}`);
  return ok(`Temporary password issued to ${user.fullName}.`);
}

export async function updateAdminEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertRole("admin");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.", { email: "Invalid email" });
  if (!(await verifyPassword(password, admin.passwordHash))) {
    return fail("Password incorrect — email unchanged.", { password: "Incorrect password" });
  }

  const [clash] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
  if (clash && clash.id !== admin.id) return fail("That email is already in use.", { email: "Already in use" });

  await db.update(profiles).set({ email }).where(eq(profiles.id, admin.id));
  await recordAudit({
    actor: admin,
    action: "auth.email_change",
    entity: "profiles",
    entityId: admin.id,
    before: { email: admin.email },
    after: { email },
  });

  revalidatePath("/admin/security");
  return ok("Sign-in email updated. Use the new address next time.");
}

export async function toggleTwoFactorAction(enabled: boolean): Promise<ActionState> {
  const admin = await assertRole("admin");
  await db.update(profiles).set({ twoFactorEnabled: enabled }).where(eq(profiles.id, admin.id));
  await recordAudit({
    actor: admin,
    action: "auth.two_factor",
    entity: "profiles",
    entityId: admin.id,
    after: { enabled },
  });
  revalidatePath("/admin/security");
  return ok(enabled ? "Two-factor prompt enabled." : "Two-factor prompt disabled.");
}

export async function setContactStatusAction(
  id: string,
  status: "new" | "read" | "archived",
): Promise<ActionState> {
  const admin = await assertRole("admin");
  await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, id));
  await recordAudit({ actor: admin, action: "contact.status", entity: "contact_submissions", entityId: id, after: { status } });
  revalidatePath("/admin/enquiries");
  return ok("Enquiry updated.");
}

export async function adminAdjustBalanceAction(
  clientId: string,
  amount: number,
  note: string,
): Promise<ActionState> {
  const admin = await assertRole("admin");
  if (!note.trim()) return fail("A reason is required for manual adjustments.");

  const [link] = await db
    .select()
    .from(traderClients)
    .where(and(eq(traderClients.clientId, clientId)))
    .limit(1);

  try {
    const result = await applyBalanceChange({
      clientId,
      traderId: link?.traderId ?? null,
      type: "adjustment",
      delta: amount,
      note,
      idempotencyKey: `admin-adj-${clientId}-${Date.now()}`,
      actor: admin,
    });
    revalidatePath(`/admin/users/${clientId}`);
    return ok(`Balance adjusted to ${result.balanceAfter.toFixed(2)}.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Adjustment failed.");
  }
}
