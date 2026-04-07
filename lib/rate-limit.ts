type RateLimitState = {
  count: number;
  resetAt: number;
};

const bucket = new Map<string, RateLimitState>();

export function isRateLimited(
  key: string,
  limit = 20,
  windowMs = 60_000,
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  bucket.set(key, current);

  return {
    limited: false,
    retryAfterSec: Math.ceil((current.resetAt - now) / 1000),
  };
}