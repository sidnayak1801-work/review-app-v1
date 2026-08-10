import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isFreshAfterOnboarding } from "./WelcomeSection";

describe("isFreshAfterOnboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when completed within 7 days", () => {
    expect(
      isFreshAfterOnboarding({
        completed: true,
        completedAt: "2026-08-08T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when completed more than 7 days ago", () => {
    expect(
      isFreshAfterOnboarding({
        completed: true,
        completedAt: "2026-07-01T12:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("returns false when onboarding was skipped", () => {
    expect(
      isFreshAfterOnboarding({
        completed: false,
        completedAt: "2026-08-10T11:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("returns false when completedAt is missing", () => {
    expect(
      isFreshAfterOnboarding({
        completed: true,
        completedAt: null,
      }),
    ).toBe(false);
  });
});
