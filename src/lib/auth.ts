import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { SESSION_COOKIE, supabaseConfigured, verifyDemoSession } from "@/lib/auth-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function getCurrentUser() {
  let id: string | undefined;
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase!.auth.getUser();
    if (error || !data.user) return null;
    id = data.user.id;
  } else {
    const session = verifyDemoSession((await cookies()).get(SESSION_COOKIE)?.value);
    id = session?.id;
  }
  if (!id) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return profile?.status === "active" ? profile : null;
}

export async function requireRole(role: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(`/${user.role}`);
  return user;
}
