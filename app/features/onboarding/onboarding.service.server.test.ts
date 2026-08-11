import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lifecycle-emails/lifecycle-email.service.server", () => ({
  lifecycleEmailService: {
    scheduleCompletionEmail: vi.fn().mockResolvedValue(undefined),
    cancelPendingReminders: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("./onboarding-analytics.server", () => ({
  trackOnboardingEvent: vi.fn(),
}));

import type {
  OnboardingStatusRecord,
  OnboardingStatusRepository,
} from "../../repositories/onboarding-status.repository.server";
import { lifecycleEmailService } from "../lifecycle-emails/lifecycle-email.service.server";
import { OnboardingService } from "./onboarding.service.server";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseRecord: OnboardingStatusRecord = {
  id: "ob-1",
  shopId: "shop-1",
  themeEnabled: true,
  reviewsImported: false,
  automationConfigured: false,
  brandingConfigured: false,
  completed: false,
  skipped: false,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-08-11T00:00:00.000Z"),
  updatedAt: new Date("2026-08-11T00:00:00.000Z"),
};

function createRepo(
  overrides: Partial<OnboardingStatusRepository> = {},
): OnboardingStatusRepository {
  return {
    findByShopId: vi.fn().mockResolvedValue(baseRecord),
    ensureForShop: vi.fn().mockResolvedValue(baseRecord),
    update: vi.fn().mockImplementation(async (_shopId, data) => ({
      ...baseRecord,
      ...data,
    })),
    ...overrides,
  };
}

describe("OnboardingService lifecycle hooks", () => {
  it("persists startedAt once when onboarding starts", async () => {
    const repo = createRepo();
    const service = new OnboardingService(repo);

    await service.markStarted("shop-1");

    expect(repo.update).toHaveBeenCalledWith("shop-1", {
      startedAt: expect.any(Date),
    });
  });

  it("does not overwrite startedAt on duplicate start", async () => {
    const started = new Date("2026-08-11T01:00:00.000Z");
    const repo = createRepo({
      ensureForShop: vi.fn().mockResolvedValue({
        ...baseRecord,
        startedAt: started,
      }),
    });
    const service = new OnboardingService(repo);

    const status = await service.markStarted("shop-1");

    expect(repo.update).not.toHaveBeenCalled();
    expect(status.needsOnboarding).toBe(true);
  });

  it("schedules completion email when onboarding completes", async () => {
    const repo = createRepo();
    const service = new OnboardingService(repo);

    const status = await service.complete("shop-1");

    expect(status.completed).toBe(true);
    expect(lifecycleEmailService.scheduleCompletionEmail).toHaveBeenCalledWith(
      "shop-1",
    );
  });

  it("is idempotent on duplicate completion", async () => {
    const completed = {
      ...baseRecord,
      completed: true,
      completedAt: new Date("2026-08-11T02:00:00.000Z"),
    };
    const repo = createRepo({
      ensureForShop: vi.fn().mockResolvedValue(completed),
      update: vi.fn(),
    });
    const service = new OnboardingService(repo);

    const status = await service.complete("shop-1");

    expect(repo.update).not.toHaveBeenCalled();
    expect(status.completed).toBe(true);
    expect(lifecycleEmailService.scheduleCompletionEmail).toHaveBeenCalledWith(
      "shop-1",
    );
  });

  it("cancels reminders when onboarding is skipped", async () => {
    const repo = createRepo();
    const service = new OnboardingService(repo);

    await service.skipOnboarding("shop-1");

    expect(lifecycleEmailService.cancelPendingReminders).toHaveBeenCalledWith(
      "shop-1",
    );
    expect(lifecycleEmailService.scheduleCompletionEmail).not.toHaveBeenCalled();
  });
});
