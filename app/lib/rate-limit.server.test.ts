import { afterEach, describe, expect, it, vi } from "vitest";

import { RateLimitError } from "./domain-error";
import { assertWithinRateLimit } from "./rate-limit.server";

afterEach(() => {
  vi.useRealTimers();
});

describe("assertWithinRateLimit", () => {
  it("allows requests under the limit and blocks after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00.000Z"));

    const key = `test-limit-${Math.random()}`;

    for (let i = 0; i < 8; i += 1) {
      expect(() => assertWithinRateLimit(key)).not.toThrow();
    }

    expect(() => assertWithinRateLimit(key)).toThrow(RateLimitError);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00.000Z"));

    const key = `test-reset-${Math.random()}`;

    for (let i = 0; i < 8; i += 1) {
      assertWithinRateLimit(key);
    }

    expect(() => assertWithinRateLimit(key)).toThrow(RateLimitError);

    vi.setSystemTime(new Date("2026-07-21T12:01:01.000Z"));
    expect(() => assertWithinRateLimit(key)).not.toThrow();
  });
});
