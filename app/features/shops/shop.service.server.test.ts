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
};

function createRepository(): ShopRepository {
  return {
    create: vi.fn().mockResolvedValue(shopRecord),
    findByDomain: vi.fn().mockResolvedValue(shopRecord),
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
});
