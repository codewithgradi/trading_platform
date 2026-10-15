import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { profiles, sessions } from "@/db/schema";
import {
  HOME_FOR_ROLE,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  signSession,
  verifySession,
  type Role,
} from "@/lib/session";
import type { Profile } from "@/db/schema";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, digest] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

function hashToken(token: string): string {
  // Opaque session tokens are stored hashed so a DB leak can't resurrect sessions.
  return Buffer.from(token).toString("base64url");
}

export async function createSession(user: Pick<Profile, "id" | "role">) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const agent = (await headers()).get("user-agent")?.slice(0, 200) ?? null;

  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, tokenHash: hashToken(token), expiresAt, userAgent: agent })
    .returning();

  const cookieValue = await signSession({
    sid: session.id,
    uid: user.id,
    role: user.role as Role,
    exp: expiresAt.getTime(),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (payload) await db.delete(sessions).where(eq(sessions.id, payload.sid));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  (await cookies()).delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const [row] = await db
    .select({ profile: profiles })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.userId))
    .where(and(eq(sessions.id, payload.sid), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || row.profile.status !== "active") return null;
  return row.profile;
});

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<Profile> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect(HOME_FOR_ROLE[user.role as Role] ?? "/login");
  return user;
}

/** Server-action guard that throws instead of redirecting. */
export async function assertRole(...roles: Role[]): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to do that.");
  if (!roles.includes(user.role as Role)) throw new Error("You do not have access to this action.");
  return user;
}
