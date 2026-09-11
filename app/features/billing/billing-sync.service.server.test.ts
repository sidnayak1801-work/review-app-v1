import { describe, expect, it, vi } from "vitest";

import type { ShopRecord, ShopRepository } from "../../repositories/shop.repository.server";
import { ShopifyBillingSyncService } from "./billing-sync.service.server";
import { BILLING_ACTIVATION_RETRIES, PRO_PLAN } from "./billing.constants";

const installedAt = new Date("2026-07-01T00:00:00.000Z");

const baseShop: ShopRecord = {
  id: "shop-1",
  shopDomain: "demo.myshopify.com",
  shopifyShopId: null,
  plan: "FREE",
  status: "INSTALLED",
  contactEmail: null,
  firstInstalledAt: installedAt,
  latestInstalledAt: installedAt,
  installedAt,
  uninstalledAt: null,
  billingStatus: "FREE",
  billingSyncedAt: new Date("2026-07-01T00:00:00.000Z"),
  billingPeriodEnd: null,
};

function createShopRepository(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn().mockResolvedValue(baseShop),
    findByDomain: vi.fn(),
    create: vi.fn(),
    install: vi.fn(),
    markUninstalled: vi.fn(),
    deleteByDomain: vi.fn(),
    updateBillingState: vi.fn().mockResolvedValue(baseShop),
    ...overrides,
  };
}

describe("ShopifyBillingSyncService", () => {
  it("maps an active Pro subscription to PRO plan", async () => {
    const updatedShop: ShopRecord = {
      ...baseShop,
      plan: "PRO",
      billingStatus: "ACTIVE",
    };
    const shops = createShopRepository({
      updateBillingState: vi.fn().mockResolvedValue(updatedShop),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: true,
        appSubscriptions: [
          {
            name: PRO_PLAN,
            id: "sub-1",
            createdAt: "2026-07-20T10:00:00.000Z",
            currentPeriodEnd: "2026-08-19T10:00:00.000Z",
            trialDays: 14,
          },
        ],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({
      shopId: "shop-1",
      billing,
    });

    expect(billing.check).toHaveBeenCalledWith({
      plans: [PRO_PLAN],
    });
    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "PRO",
        billingStatus: "ACTIVE",
      }),
    );
    expect(result.shop.plan).toBe("PRO");
    expect(result.proSubscription).toEqual({
      id: "sub-1",
      createdAt: "2026-07-20T10:00:00.000Z",
      currentPeriodEnd: "2026-08-19T10:00:00.000Z",
      trialDays: 14,
      test: false,
    });
  });

  it("reports the subscription's test flag", async () => {
    const shops = createShopRepository({
      updateBillingState: vi
        .fn()
        .mockResolvedValue({ ...baseShop, plan: "PRO", billingStatus: "ACTIVE" }),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: true,
        appSubscriptions: [{ name: PRO_PLAN, id: "sub-1", test: true }],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({
      shopId: "shop-1",
      billing,
    });

    expect(result.proSubscription?.test).toBe(true);
  });

  it("never filters the subscription check to non-test charges", async () => {
    // Regression guard for the App Store rejection: passing `isTest: false`
    // makes the Shopify SDK discard test subscriptions, which is every
    // subscription a development store can hold, so reviewers could not test
    // the paid plan.
    const updatedShop: ShopRecord = {
      ...baseShop,
      plan: "PRO",
      billingStatus: "ACTIVE",
    };
    const shops = createShopRepository({
      updateBillingState: vi.fn().mockResolvedValue(updatedShop),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: true,
        appSubscriptions: [{ name: PRO_PLAN, id: "sub-test", test: true }],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({ shopId: "shop-1", billing });

    expect(billing.check).toHaveBeenCalledWith({ plans: [PRO_PLAN] });
    expect(billing.check.mock.calls[0]?.[0]).not.toHaveProperty("isTest");
    expect(result.shop.plan).toBe("PRO");
  });

  it("maps missing Pro subscription to FREE plan", async () => {
    const shops = createShopRepository();
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: false,
        appSubscriptions: [],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({
      shopId: "shop-1",
      billing,
    });

    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "FREE",
        billingStatus: "FREE",
      }),
    );
    expect(result.proSubscription).toBeNull();
  });

  it("reuses cached billing when sync is fresh", async () => {
    const shops = createShopRepository();
    const billing = {
      check: vi.fn(),
    };
    const service = new ShopifyBillingSyncService(shops);
    const freshShop: ShopRecord = {
      ...baseShop,
      billingSyncedAt: new Date(),
    };

    const result = await service.resolvePlanForShop({
      shop: freshShop,
      billing,
    });

    expect(billing.check).not.toHaveBeenCalled();
    expect(result).toBe(freshShop);
  });

  it("reuses cached billing when Shopify sync fails", async () => {
    const shops = createShopRepository();
    const billing = {
      check: vi.fn().mockRejectedValue(new Error("Billing API unavailable")),
    };
    const service = new ShopifyBillingSyncService(shops);
    const staleShop: ShopRecord = {
      ...baseShop,
      billingSyncedAt: new Date("2020-01-01T00:00:00.000Z"),
    };

    const result = await service.resolvePlanForShop({
      shop: staleShop,
      billing,
      forceSync: true,
    });

    expect(result).toBe(staleShop);
    expect(shops.updateBillingState).not.toHaveBeenCalled();
  });

  it("keeps PRO when a scheduled downgrade has not reached billingPeriodEnd", async () => {
    const periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const scheduledShop: ShopRecord = {
      ...baseShop,
      plan: "PRO",
      billingStatus: "DOWNGRADE_SCHEDULED",
      billingPeriodEnd: periodEnd,
    };
    const shops = createShopRepository({
      findById: vi.fn().mockResolvedValue(scheduledShop),
      updateBillingState: vi.fn().mockResolvedValue(scheduledShop),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: false,
        appSubscriptions: [],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({
      shopId: "shop-1",
      billing,
    });

    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "PRO",
        billingStatus: "DOWNGRADE_SCHEDULED",
        billingPeriodEnd: periodEnd,
      }),
    );
    expect(result.presentation.billingPhase).toBe("PRO_DOWNGRADE_SCHEDULED");
    expect(result.shop.plan).toBe("PRO");
  });

  it("writes FREE when a scheduled downgrade period has ended", async () => {
    const expiredShop: ShopRecord = {
      ...baseShop,
      plan: "PRO",
      billingStatus: "DOWNGRADE_SCHEDULED",
      billingPeriodEnd: new Date("2020-01-01T00:00:00.000Z"),
    };
    const shops = createShopRepository({
      findById: vi.fn().mockResolvedValue(expiredShop),
      updateBillingState: vi.fn().mockResolvedValue({
        ...baseShop,
        plan: "FREE",
        billingStatus: "FREE",
        billingPeriodEnd: null,
      }),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: false,
        appSubscriptions: [],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    await service.syncFromShopify({ shopId: "shop-1", billing });

    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "FREE",
        billingStatus: "FREE",
        billingPeriodEnd: null,
      }),
    );
  });

  it("clears scheduled downgrade when Shopify still reports active Pro", async () => {
    const periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const scheduledShop: ShopRecord = {
      ...baseShop,
      plan: "PRO",
      billingStatus: "DOWNGRADE_SCHEDULED",
      billingPeriodEnd: periodEnd,
    };
    const shops = createShopRepository({
      findById: vi.fn().mockResolvedValue(scheduledShop),
      updateBillingState: vi.fn().mockResolvedValue({
        ...scheduledShop,
        billingStatus: "ACTIVE",
        billingPeriodEnd: new Date("2026-08-19T10:00:00.000Z"),
      }),
    });
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: true,
        appSubscriptions: [
          {
            name: PRO_PLAN,
            id: "sub-1",
            currentPeriodEnd: "2026-08-19T10:00:00.000Z",
          },
        ],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    await service.syncFromShopify({ shopId: "shop-1", billing });

    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "PRO",
        billingStatus: "ACTIVE",
      }),
    );
  });

  it("writes FREE billing status when there is no active Pro and no schedule", async () => {
    const shops = createShopRepository();
    const billing = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: false,
        appSubscriptions: [],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    await service.syncFromShopify({ shopId: "shop-1", billing });

    const written = vi.mocked(shops.updateBillingState).mock.calls[0]?.[1];
    expect(written?.billingStatus).toBe("FREE");
  });

  it("rethrows a thrown Response instead of falling back to the cached plan", async () => {
    // App Bridge reauth arrives as a thrown Response. Absorbing it would leave
    // the merchant on a stale plan with no way to recover.
    const reauth = new Response(undefined, { status: 401 });
    const shops = createShopRepository();
    const billing = { check: vi.fn().mockRejectedValue(reauth) };
    const service = new ShopifyBillingSyncService(shops);

    await expect(
      service.resolvePlanForShop({
        shop: { ...baseShop, billingSyncedAt: new Date("2020-01-01") },
        billing,
        forceSync: true,
      }),
    ).rejects.toBe(reauth);
  });

  describe("awaitActivation", () => {
    const sleep = () => Promise.resolve();

    it("re-reads until Shopify reports the approved subscription", async () => {
      const shops = createShopRepository({
        updateBillingState: vi
          .fn()
          .mockResolvedValue({ ...baseShop, plan: "PRO", billingStatus: "ACTIVE" }),
      });
      const billing = {
        check: vi
          .fn()
          .mockResolvedValueOnce({ hasActivePayment: false, appSubscriptions: [] })
          .mockResolvedValue({
            hasActivePayment: true,
            appSubscriptions: [{ name: PRO_PLAN, id: "sub-1" }],
          }),
      };
      const service = new ShopifyBillingSyncService(shops, sleep);

      const result = await service.syncFromShopify({
        shopId: "shop-1",
        billing,
        awaitActivation: true,
      });

      expect(billing.check).toHaveBeenCalledTimes(2);
      expect(result.shop.plan).toBe("PRO");
    });

    it("gives up and writes FREE when the charge was really declined", async () => {
      const shops = createShopRepository();
      const billing = {
        check: vi
          .fn()
          .mockResolvedValue({ hasActivePayment: false, appSubscriptions: [] }),
      };
      const service = new ShopifyBillingSyncService(shops, sleep);

      const result = await service.syncFromShopify({
        shopId: "shop-1",
        billing,
        awaitActivation: true,
      });

      expect(billing.check).toHaveBeenCalledTimes(
        BILLING_ACTIVATION_RETRIES + 1,
      );
      expect(result.shop.plan).toBe("FREE");
    });

    it("does not retry on an ordinary page load", async () => {
      const shops = createShopRepository();
      const billing = {
        check: vi
          .fn()
          .mockResolvedValue({ hasActivePayment: false, appSubscriptions: [] }),
      };
      const service = new ShopifyBillingSyncService(shops, sleep);

      await service.syncFromShopify({ shopId: "shop-1", billing });

      expect(billing.check).toHaveBeenCalledTimes(1);
    });
  });
});
