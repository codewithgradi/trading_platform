import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { auditLog, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE, signDemoSession, supabaseConfigured } from "@/lib/auth-core";
import { allowRequest } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const address = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!allowRequest(`auth:${address}`, 20, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  if (action === "logout" || action === "logout-all") {
    const user = await getCurrentUser();
    if (user) await db.insert(auditLog).values({ actorId: user.id, action: action === "logout-all" ? "auth.logout_all" : "auth.logout", entity: "profile", entityId: user.id });
    if (supabaseConfigured()) await (await createSupabaseServerClient())?.auth.signOut({ scope: action === "logout-all" ? "global" : "local" });
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (action === "forgot") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (supabaseConfigured()) {
      const client = (await createSupabaseServerClient())!;
      await client.auth.resetPasswordForEmail(email, { redirectTo: `${request.nextUrl.origin}/reset-password` });
    }
    return NextResponse.json({ ok: true, message: "If an account exists for this address, you will receive reset instructions shortly." });
  }
  if (action === "reset") {
    if (!supabaseConfigured()) return NextResponse.json({ error: "For the local demo, change your password from your profile after logging in." }, { status: 400 });
    const password = String(body.password || "");
    if (password.length < 8) return NextResponse.json({ error: "Use at least eight characters." }, { status: 400 });
    const { error } = await (await createSupabaseServerClient())!.auth.updateUser({ password });
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (action !== "login") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  try {
    let userId: string | undefined;
    if (supabaseConfigured()) {
      const client = (await createSupabaseServerClient())!;
      const { data, error } = await client.auth.signInWithPassword({ email, password: parsed.data.password });
      if (error) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      userId = data.user?.id;
    } else {
      const [person] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
      if (!person?.passwordHash || !(await compare(parsed.data.password, person.passwordHash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      userId = person.id;
    }
    const [person] = await db.select().from(profiles).where(eq(profiles.id, userId!)).limit(1);
    if (!person || person.status !== "active") return NextResponse.json({ error: "This account is not active. Please contact our team." }, { status: 403 });
    await db.insert(auditLog).values({ actorId: person.id, action: "auth.login", entity: "profile", entityId: person.id });
    const response = NextResponse.json({ ok: true, role: person.role });
    if (!supabaseConfigured()) response.cookies.set(SESSION_COOKIE, signDemoSession(person.id, person.role), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch { return NextResponse.json({ error: "Sign in is temporarily unavailable. Please try again." }, { status: 500 }); }
}
