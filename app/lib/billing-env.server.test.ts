import { beforeEach, describe, expect, it, vi } from "vitest";

const { isDevelopmentStore } = vi.hoisted(() => ({
  isDevelopmentStore: vi.fn(),
}));

vi.mock("../services/shopify-shop-plan.server", () => ({
  isDevelopmentStore,
}));

import { resolveChargeTestContext, resolveChargeTestMode } from "./billing-env.server";

const admin = { graphql: vi.fn() };

describe("resolveChargeTestContext", () => {
  beforeEach(() => {
    isDevelopmentStore.mockReset();
  });

  it("forces test charges on development stores even when BILLING_TEST_MODE=false", async () => {
    isDevelopmentStore.mockResolvedValue(true);

    const result = await resolveChargeTestContext(admin, {
      BILLING_TEST_MODE: "false",
      NODE_ENV: "production",
    });

    expect(result).toEqual({ isTest: true, partnerDevelopment: true });
  });

  it("honors BILLING_TEST_MODE=false on live stores", async () => {
    isDevelopmentStore.mockResolvedValue(false);

    const result = await resolveChargeTestContext(admin, {
      BILLING_TEST_MODE: "false",
      NODE_ENV: "production",
    });

    expect(result).toEqual({ isTest: false, partnerDevelopment: false });
  });

  it("honors BILLING_TEST_MODE=true on live stores", async () => {
    isDevelopmentStore.mockResolvedValue(false);

    const result = await resolveChargeTestContext(admin, {
      BILLING_TEST_MODE: "true",
      NODE_ENV: "production",
    });

    expect(result).toEqual({ isTest: true, partnerDevelopment: false });
  });

  it("falls back to NODE_ENV when store type is unknown", async () => {
    isDevelopmentStore.mockResolvedValue(null);

    await expect(
      resolveChargeTestContext(admin, { NODE_ENV: "production" }),
    ).resolves.toEqual({ isTest: false, partnerDevelopment: null });

    await expect(
      resolveChargeTestContext(admin, { NODE_ENV: "development" }),
    ).resolves.toEqual({ isTest: true, partnerDevelopment: null });
  });
});

describe("resolveChargeTestMode", () => {
  beforeEach(() => {
    isDevelopmentStore.mockReset();
  });

  it("returns isTest from resolveChargeTestContext", async () => {
    isDevelopmentStore.mockResolvedValue(true);

    await expect(
      resolveChargeTestMode(admin, { BILLING_TEST_MODE: "false" }),
    ).resolves.toBe(true);
  });
});
