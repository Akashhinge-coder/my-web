/**
 * Production-grade in-memory rate limiter.
 *
 * Uses a sliding window per identity key.
 * Suitable for single-process Next.js deployments (Vercel serverless has
 * short-lived processes, so limits are per-instance; for multi-instance
 * deployments, replace with Redis/Upstash).
 *
 * CONFIGURATION
 * Each limit is { max requests } per { windowMs milliseconds }.
 */

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

// In-memory store: key → window
const store = new Map<string, RateLimitWindow>();

// Periodically clean up expired windows to prevent memory leaks.
// This is a no-op in serverless environments (short-lived).
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of store.entries()) {
    if (now > window.resetAt) store.delete(key);
  }
}, 60_000).unref?.();

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Checks and increments a rate limit for the given identity key.
 *
 * @param key       Unique identity string (e.g. "userId:endpoint" or "ip:endpoint")
 * @param config    Rate limit configuration
 * @returns         Whether the request is allowed and remaining count
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let window = store.get(key);

  if (!window || now > window.resetAt) {
    window = { count: 0, resetAt: now + config.windowMs };
    store.set(key, window);
  }

  window.count++;
  const allowed = window.count <= config.max;
  const remaining = Math.max(0, config.max - window.count);

  return { allowed, remaining, resetAt: window.resetAt };
}

/** Pre-configured limits for the platform layer. */
export const RATE_LIMITS = {
  /** Superadmin dashboard view: 60 requests per minute */
  PLATFORM_DASHBOARD: { max: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Restaurant activation toggle: 10 requests per minute */
  PLATFORM_ACTIVATION: { max: 10, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Audit log read: 30 requests per minute */
  AUDIT_READ: { max: 30, windowMs: 60_000 } satisfies RateLimitConfig,
} as const;
