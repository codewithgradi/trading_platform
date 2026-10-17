import { createHmac, timingSafeEqual } from "node:crypto";

const sessionSecret = () => process.env.SESSION_SECRET || process.env.DATABASE_URL || "";
export const SESSION_COOKIE = "northline_session";

type Session = { id: string; role: string; exp: number };
export function signDemoSession(id: string, role: string) {
  const payload = Buffer.from(JSON.stringify({ id, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 } satisfies Session)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function verifyDemoSession(value?: string): Session | null {
  if (!value || !sessionSecret()) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return session.exp > Date.now() && typeof session.id === "string" && ["admin", "trader", "client"].includes(session.role) ? session : null;
  } catch { return null; }
}
export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
export const supabaseKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
