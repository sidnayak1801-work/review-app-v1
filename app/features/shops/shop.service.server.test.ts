import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ShopRecord,
  ShopRepository,
} from "../../repositories/shop.repository.server";
import { ShopService } from "./shop.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

const shopRecord: ShopRecord = {
  id: "shop-1",
  shopDomain: "example.myshopify.com",
  shopifyShopId: "gid://shopify/Shop/1",
  plan: "FREE",
  status: "INSTALLED",
  installedAt: new Date("2026-07-17T00:00:00.000Z"),
  uninstalledAt: null,
  billingStatus: null,
  billingSyncedAt: null,
};

const uninstalledShopRecord: ShopRecord = {
  ...shopRecord,
  status: "UNINSTALLED",
  uninstalledAt: new Date("2026-07-18T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn().mockResolvedValue(shopRecord),
    create: vi.fn().mockResolvedValue(shopRecord),
    findByDomain: vi.fn().mockResolvedValue(shopRecord),
    install: vi.fn().mockResolvedValue(shopRecord),
    markUninstalled: vi.fn().mockResolvedValue(uninstalledShopRecord),
    deleteByDomain: vi.fn().mockResolvedValue(uninstalledShopRecord),
    updateBillingState: vi.fn().mockResolvedValue(shopRecord),
    ...overrides,
  };
}

describe("ShopService", () => {
  it("validates and normalizes a domain before lookup", async () => {
    const repository = createRepository();
    const service = new ShopService(repository);

    await service.findByDomain(" Example.myshopify.com ");

    expect(repository.findByDomain).toHaveBeenCalledWith(
      "example.myshopify.com",
    );
  });

  it("rejects an invalid shop before repository access", async () => {
    const repository = createRepository();
    const service = new ShopService(repository);

    await expect(
      service.create({ shopDomain: "not-a-shop-domain" }),
    ).rejects.toThrow("Invalid shop");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a validated shop record", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new ShopService(repository);

    const shop = await service.create({
      shopDomain: shopRecord.shopDomain,
      shopifyShopId: shopRecord.shopifyShopId,
    });

    expect(shop).toBe(shopRecord);
    expect(repository.create).toHaveBeenCalledWith({
      shopDomain: shopRecord.shopDomain,
      shopifyShopId: shopRecord.shopifyShopId,
    });
  });

  it("installs a validated shop record", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new ShopService(repository);

    const shop = await service.install({
      shopDomain: " Example.myshopify.com ",
      shopifyShopId: shopRecord.shopifyShopId,
    });

    expect(shop).toBe(shopRecord);
    expect(repository.install).toHaveBeenCalledWith({
      shopDomain: "example.myshopify.com",
      shopifyShopId: shopRecord.shopifyShopId,
    });
  });

  it("marks a shop uninstalled without requiring extra input", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new ShopService(repository);

    const shop = await service.uninstall(" Example.myshopify.com ");

    expect(shop).toBe(uninstalledShopRecord);
    expect(repository.markUninstalled).toHaveBeenCalledWith(
      "example.myshopify.com",
    );
  });

  it("returns null when uninstall targets an unknown shop", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const repository = createRepository({
      markUninstalled: vi.fn().mockResolvedValue(null),
    });
    const service = new ShopService(repository);

    const shop = await service.uninstall("missing.myshopify.com");

    expect(shop).toBeNull();
  });
});
