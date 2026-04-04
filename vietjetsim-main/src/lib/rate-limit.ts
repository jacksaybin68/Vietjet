/**
 * In-Memory Rate Limiter for Next.js Middleware
 *
 * Uses a sliding window counter stored in a module-level Map.
 * Suitable for single-instance deployments (Vercel, Netlify serverless).
 * For multi-instance, use Redis-backed rate limiting (e.g., Upstash).
 *
 * Usage:
 *   import { rateLimit, rateLimiter } from '@/lib/rate-limit';
 *
 *   // In middleware:
 *   const limited = rateLimit(request, { windowMs: 60000, maxRequests: 10 });
 *   if (limited) return limited;
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60s) */
  windowMs?: number;
  /** Max requests within window (default: 10) */
  maxRequests?: number;
}

/** Predefined rate limit configurations */
export const RATE_LIMITS = {
  /** Auth endpoints: 5 requests per minute per IP */
  auth: { windowMs: 60_000, maxRequests: 5 },
  /** General API: 100 requests per minute per IP */
  api: { windowMs: 60_000, maxRequests: 100 },
  /** Strict: 3 requests per minute (login, register) */
  strict: { windowMs: 60_000, maxRequests: 3 },
} as const;

// In-memory store: IP → RateLimitEntry
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate-limited.
 * @param request - The incoming NextRequest
 * @param options - Rate limit configuration
 * @returns A 429 Response if rate-limited, or null if allowed
 */
export function rateLimit(request: Request, options: RateLimitOptions = {}): Response | null {
  const { windowMs = 60_000, maxRequests = 10 } = options;

  // Start cleanup on first call
  startCleanup();

  // Get client IP from various headers (supports proxy/CDN)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const key = `${ip}:${request.method}:${new URL(request.url).pathname}`;

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  // Within existing window
  if (existing.count >= maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(existing.resetAt),
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  existing.count++;
  return null;
}

/**
 * Get current rate limit headers for a given key (for non-blocking responses)
 */
export function getRateLimitHeaders(
  ip: string,
  method: string,
  pathname: string,
  options: RateLimitOptions = {}
): Record<string, string> {
  const { maxRequests = 10 } = options;
  const key = `${ip}:${method}:${pathname}`;
  const entry = store.get(key);
  const remaining = entry ? Math.max(0, maxRequests - entry.count) : maxRequests;

  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    ...(entry ? { 'X-RateLimit-Reset': String(entry.resetAt) } : {}),
  };
}

// ─── Test Helpers ─────────────────────────────────────────────────────────────

export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function createRateLimitKey(ip: string, method: string, pathname: string): string {
  return `${ip}:${method}:${pathname}`;
}

// Legacy rate limiter (for backwards compatibility)
export const legacyRateLimit = rateLimit;

// Convenience rate limiters with predefined configs
export const rateLimiter = {
  auth: (request: Request) => rateLimit(request, RATE_LIMITS.auth),
  strict: (request: Request) => rateLimit(request, RATE_LIMITS.strict),
  api: (request: Request) => rateLimit(request, RATE_LIMITS.api),
};

// Expose store for testing
export function _getStore(): Map<string, RateLimitEntry> {
  return store;
}

export function _clearStore(): void {
  store.clear();
}
