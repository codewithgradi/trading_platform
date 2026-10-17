import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { SESSION_COOKIE, supabaseConfigured, supabaseKey, verifyDemoSession } from "@/lib/auth-core";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const role = path.match(/^\/(admin|trader|client)(?:\/|$)/)?.[1];
  if (!role && !supabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });
  let userId: string | undefined;
  if (supabaseConfigured()) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey(), {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  } else {
    const session = verifyDemoSession(request.cookies.get(SESSION_COOKIE)?.value);
    userId = session?.id;
  }
  if (!role) return response;
  if (!userId) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  const [profile] = await db.select({ role: profiles.role, status: profiles.status }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!profile || profile.status !== "active") return NextResponse.redirect(new URL("/login", request.url));
  if (profile.role !== role) return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|uploads/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"] };
