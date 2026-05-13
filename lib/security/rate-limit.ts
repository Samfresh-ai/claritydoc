import type { NextRequest } from "next/server";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 8;
const buckets = new Map<string, number[]>();

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    };
  }

  recent.push(now);
  buckets.set(key, recent);

  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
