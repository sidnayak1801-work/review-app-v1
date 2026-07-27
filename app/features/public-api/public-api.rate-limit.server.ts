import type { ShopPlan } from "../../repositories/shop.repository.server";
import { RateLimitError } from "../../lib/domain-error";

export interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch seconds when the window resets. */
  resetAt: number;
}

/**
 * Transport-agnostic rate limiter for public API (REST now, GraphQL later).
 * Production may swap in a Redis implementation without changing callers.
 */
export interface RateLimiter {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
}

interface BucketEntry {
  count: number;
  resetAtMs: number;
}

/**
 * Process-local fixed window. Not shared across instances — replace with
 * RedisRateLimiter when multi-instance rate limiting is required.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();

  async consume(
    key: string,
    policy: RateLimitPolicy,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAtMs <= now) {
      const resetAtMs = now + policy.windowMs;
      this.buckets.set(key, { count: 1, resetAtMs });
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: Math.max(0, policy.maxRequests - 1),
        resetAt: Math.ceil(resetAtMs / 1000),
      };
    }

    if (existing.count >= policy.maxRequests) {
      return {
        allowed: false,
        limit: policy.maxRequests,
        remaining: 0,
        resetAt: Math.ceil(existing.resetAtMs / 1000),
      };
    }

    existing.count += 1;
    this.buckets.set(key, existing);
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: Math.max(0, policy.maxRequests - existing.count),
      resetAt: Math.ceil(existing.resetAtMs / 1000),
    };
  }

  /** Test helper */
  clear(): void {
    this.buckets.clear();
  }
}

/** Default shared limiter for public API routes. */
export const publicApiRateLimiter: RateLimiter = new InMemoryRateLimiter();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

/**
 * Plan-aware hook: Free and Pro share the same limits today; diverge later
 * without changing route code.
 */
export function getPublicApiRateLimitPolicy(plan: ShopPlan): RateLimitPolicy {
  void plan;
  return {
    maxRequests: DEFAULT_MAX_REQUESTS,
    windowMs: DEFAULT_WINDOW_MS,
  };
}

export async function assertPublicApiRateLimit(
  limiter: RateLimiter,
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const result = await limiter.consume(key, policy);
  if (!result.allowed) {
    throw new RateLimitError();
  }
  return result;
}

export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}
