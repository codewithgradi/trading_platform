import type { ZodError } from "zod";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  data?: Record<string, unknown>;
};

export const idleState: ActionState = { status: "idle" };

export function fail(message: string, errors?: Record<string, string>): ActionState {
  return { status: "error", message, errors };
}

export function ok(message: string, data?: Record<string, unknown>): ActionState {
  return { status: "success", message, data };
}

export function zodErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/* Lightweight fixed-window rate limiter for auth + public endpoints. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
