import { NextResponse, type NextRequest } from "next/server";

import { HOME_FOR_ROLE, SESSION_COOKIE, verifySession } from "@/lib/session";

const PORTAL_PREFIXES = [
  { prefix: "/admin", role: "admin" as const },
  { prefix: "/trader", role: "trader" as const },
  { prefix: "/client", role: "client" as const },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const portal = PORTAL_PREFIXES.find((entry) => pathname.startsWith(entry.prefix));

  if (portal) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== portal.role) {
      return NextResponse.redirect(new URL(HOME_FOR_ROLE[session.role] ?? "/login", request.url));
    }
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(HOME_FOR_ROLE[session.role] ?? "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/trader/:path*", "/client/:path*", "/login"],
};
