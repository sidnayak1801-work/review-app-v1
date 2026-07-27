import { afterEach, describe, expect, it } from "vitest";

import { RateLimitError } from "../../lib/domain-error";
import {
  assertPublicApiRateLimit,
  getPublicApiRateLimitPolicy,
  InMemoryRateLimiter,
  rateLimitHeaders,
} from "./public-api.rate-limit.server";

afterEach(() => {
  // no shared singleton cleared here; tests use local instances
});

describe("InMemoryRateLimiter", () => {
  it("allows requests under the limit and tracks remaining", async () => {
    const limiter = new InMemoryRateLimiter();
    const policy = { maxRequests: 3, windowMs: 60_000 };

    const first = await limiter.consume("k1", policy);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = await limiter.consume("k1", policy);
    expect(second.remaining).toBe(1);
  });

  it("denies when the window is exhausted", async () => {
    const limiter = new InMemoryRateLimiter();
    const policy = { maxRequests: 1, windowMs: 60_000 };

    await limiter.consume("k2", policy);
    const blocked = await limiter.consume("k2", policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("assertPublicApiRateLimit throws RateLimitError", async () => {
    const limiter = new InMemoryRateLimiter();
    const policy = { maxRequests: 1, windowMs: 60_000 };
    await assertPublicApiRateLimit(limiter, "k3", policy);
    await expect(
      assertPublicApiRateLimit(limiter, "k3", policy),
    ).rejects.toThrow(RateLimitError);
  });

  it("exposes rate limit headers", () => {
    expect(
      rateLimitHeaders({
        allowed: true,
        limit: 120,
        remaining: 119,
        resetAt: 1_700_000_000,
      }),
    ).toEqual({
      "X-RateLimit-Limit": "120",
      "X-RateLimit-Remaining": "119",
      "X-RateLimit-Reset": "1700000000",
    });
  });

  it("returns the same policy for Free and Pro today", () => {
    expect(getPublicApiRateLimitPolicy("FREE")).toEqual(
      getPublicApiRateLimitPolicy("PRO"),
    );
  });
});
