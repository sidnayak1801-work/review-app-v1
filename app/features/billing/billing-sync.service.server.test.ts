import { describe, expect, it, vi } from "vitest";

import type { ShopRecord, ShopRepository } from "../../repositories/shop.repository.server";
import { ShopifyBillingSyncService } from "./billing-sync.service.server";
import { PRO_PLAN } from "./billing.constants";

const baseShop: ShopRecord = {
  id: "shop-1",
  shopDomain: "demo.myshopify.com",
  shopifyShopId: null,
  plan: "FREE",
  status: "INSTALLED",
  installedAt: new Date("2026-07-01T00:00:00.000Z"),
  uninstalledAt: null,
  billingStatus: "FREE",
  billingSyncedAt: new Date("2026-07-01T00:00:00.000Z"),
};

function createShopRepository(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn(),
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
        appSubscriptions: [{ name: PRO_PLAN, id: "sub-1" }],
      }),
    };
    const service = new ShopifyBillingSyncService(shops);

    const result = await service.syncFromShopify({
      shopId: "shop-1",
      billing,
      isTest: true,
    });

    expect(billing.check).toHaveBeenCalledWith({
      plans: [PRO_PLAN],
      isTest: true,
    });
    expect(shops.updateBillingState).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        plan: "PRO",
        billingStatus: "ACTIVE",
      }),
    );
    expect(result.plan).toBe("PRO");
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

    await service.syncFromShopify({
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
});
