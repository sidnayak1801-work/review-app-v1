import { describe, expect, it, vi } from "vitest";

import type {
  OnboardingStatusRecord,
  OnboardingStatusRepository,
} from "../../repositories/onboarding-status.repository.server";
import { OnboardingService } from "./onboarding.service.server";

function baseRecord(
  overrides: Partial<OnboardingStatusRecord> = {},
): OnboardingStatusRecord {
  return {
    id: "ob-1",
    shopId: "shop-1",
    themeEnabled: false,
    reviewsImported: false,
    automationConfigured: false,
    brandingConfigured: false,
    completed: false,
    skipped: false,
    completedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createService(store: { record: OnboardingStatusRecord }) {
  const statuses = {
    findByShopId: vi.fn(async () => store.record),
    ensureForShop: vi.fn(async () => store.record),
    update: vi.fn(async (_shopId, data) => {
      store.record = { ...store.record, ...data, updatedAt: new Date() };
      return store.record;
    }),
  } as unknown as OnboardingStatusRepository;

  return new OnboardingService(statuses);
}

describe("OnboardingService", () => {
  it("reports needsOnboarding when not completed or skipped", async () => {
    const store = { record: baseRecord() };
    const service = createService(store);

    await expect(service.getStatus("shop-1")).resolves.toMatchObject({
      needsOnboarding: true,
      completed: false,
      progress: 0,
    });
  });

  it("computes progress in 25% steps", async () => {
    const store = {
      record: baseRecord({
        themeEnabled: true,
        automationConfigured: true,
      }),
    };
    const service = createService(store);

    await expect(service.getStatus("shop-1")).resolves.toMatchObject({
      progress: 50,
    });
  });

  it("marks theme enabled", async () => {
    const store = { record: baseRecord() };
    const service = createService(store);

    const status = await service.markThemeEnabled("shop-1");
    expect(status.themeEnabled).toBe(true);
    expect(status.progress).toBe(25);
  });

  it("complete requires themeEnabled", async () => {
    const store = { record: baseRecord() };
    const service = createService(store);

    const blocked = await service.complete("shop-1");
    expect(blocked.completed).toBe(false);

    store.record.themeEnabled = true;
    const status = await service.complete("shop-1");
    expect(status.completed).toBe(true);
    expect(status.needsOnboarding).toBe(false);
  });

  it("skip onboarding sets skipped without completed", async () => {
    const store = { record: baseRecord() };
    const service = createService(store);

    const status = await service.skipOnboarding("shop-1");
    expect(status.skipped).toBe(true);
    expect(status.needsOnboarding).toBe(false);
  });
});
