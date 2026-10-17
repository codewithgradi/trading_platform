const attempts = new Map<string, { count: number; reset: number }>();
// In-process safety net for the demo. Use a shared edge/Redis limiter in multi-instance production.
export function allowRequest(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}
