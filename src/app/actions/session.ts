"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  createSession,
  destroyAllSessions,
  destroyCurrentSession,
  getCurrentUser,
  verifyPassword,
} from "@/lib/auth";
import { fail, ok, rateLimit, zodErrors, type ActionState } from "@/lib/action-state";
import { recordAudit } from "@/lib/ledger";
import { HOME_FOR_ROLE, type Role } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodErrors(parsed.error));

  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  if (!rateLimit(`login:${ip}:${parsed.data.email}`, 8, 60_000)) {
    return fail("Too many attempts. Wait a minute and try again.");
  }

  const [user] = await db.select().from(profiles).where(eq(profiles.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return fail("That email and password combination doesn't match our records.");
  }
  if (user.status !== "active") {
    return fail("This account is suspended. Contact your administrator.");
  }

  await createSession(user);
  await db.update(profiles).set({ lastLoginAt: new Date() }).where(eq(profiles.id, user.id));
  await recordAudit({
    actor: user,
    action: "auth.login",
    entity: "profiles",
    entityId: user.id,
    after: { email: user.email },
  });

  redirect(HOME_FOR_ROLE[user.role as Role] ?? "/");
}

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) {
    await recordAudit({ actor: user, action: "auth.logout", entity: "profiles", entityId: user.id });
  }
  await destroyCurrentSession();
  redirect("/login");
}

export async function signOutEverywhereAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You are not signed in.");
  await recordAudit({ actor: user, action: "auth.logout_all", entity: "profiles", entityId: user.id });
  await destroyAllSessions(user.id);
  return ok("All sessions were signed out.");
}

export async function persistThemeAction(theme: string) {
  const user = await getCurrentUser();
  if (!user) return;
  if (!["light", "dark", "system"].includes(theme)) return;
  await db.update(profiles).set({ theme }).where(eq(profiles.id, user.id));
}

export async function completeOnboardingAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(profiles).set({ onboardingCompleted: true }).where(eq(profiles.id, user.id));
}

export async function restartOnboardingAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(profiles).set({ onboardingCompleted: false }).where(eq(profiles.id, user.id));
}
