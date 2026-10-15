/**
 * Edge-safe session token helpers.
 *
 * The cookie carries a signed payload so Next.js middleware can make a fast
 * route-guard decision without touching the database. Every server action and
 * route handler re-verifies the session against the `sessions` table, so the
 * cookie alone is never trusted for data access.
 */

export const SESSION_COOKIE = "mcp_session";
export const SESSION_TTL_DAYS = 14;

export type Role = "admin" | "trader" | "client";

export type SessionPayload = {
  sid: string;
  uid: string;
  role: Role;
  exp: number;
};

const encoder = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET ?? "meridian-dev-secret-change-me";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await signingKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await signingKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as unknown as ArrayBuffer,
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const HOME_FOR_ROLE: Record<Role, string> = {
  admin: "/admin",
  trader: "/trader",
  client: "/client",
};
