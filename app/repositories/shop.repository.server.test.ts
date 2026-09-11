import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaShopRepository, type ShopRecord } from "./shop.repository.server";

const installedAt = new Date("2026-07-01T00:00:00.000Z");

const proShop: ShopRecord = {
  id: "shop-1",
  shopDomain: "demo.myshopify.com",
  shopifyShopId: null,
  plan: "PRO",
  status: "INSTALLED",
  contactEmail: null,
  firstInstalledAt: installedAt,
  latestInstalledAt: installedAt,
  installedAt,
  uninstalledAt: null,
  billingStatus: "ACTIVE",
  billingSyncedAt: installedAt,
  billingPeriodEnd: null,
};

function createRepository(existing: ShopRecord | null) {
  const upsert = vi.fn().mockResolvedValue(proShop);
  const database = {
    shop: {
      findUnique: vi.fn().mockResolvedValue(existing),
      upsert,
    },
  } as unknown as PrismaClient;

  return { repository: new PrismaShopRepository(database), upsert };
}

describe("PrismaShopRepository.install", () => {
  it("resets billing entitlements when a previously uninstalled shop returns", async () => {
    // Shopify cancels the subscription on uninstall, so a reinstalling shop
    // must be asked to approve a charge again (App Store requirement 1.2.2).
    const { repository, upsert } = createRepository({
      ...proShop,
      status: "UNINSTALLED",
    });

    await repository.install({ shopDomain: proShop.shopDomain });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          plan: "FREE",
          billingStatus: "FREE",
          billingSyncedAt: null,
          billingPeriodEnd: null,
        }),
      }),
    );
  });

  it("keeps billing entitlements for an already installed shop", async () => {
    // afterAuth calls install() on every token exchange, so an unconditional
    // reset would drop a paying merchant's plan.
    const { repository, upsert } = createRepository(proShop);

    await repository.install({ shopDomain: proShop.shopDomain });

    const update = upsert.mock.calls[0]?.[0]?.update;
    expect(update).not.toHaveProperty("plan");
    expect(update).not.toHaveProperty("billingStatus");
    expect(update).not.toHaveProperty("billingSyncedAt");
  });

  it("does not reset billing state for a brand new shop", async () => {
    const { repository, upsert } = createRepository(null);

    await repository.install({ shopDomain: "new.myshopify.com" });

    expect(upsert.mock.calls[0]?.[0]?.update).not.toHaveProperty("plan");
  });
});

describe("PrismaShopRepository.updateBillingState", () => {
  function createRepositoryWithUpdate(update: () => Promise<unknown>) {
    const database = {
      shop: { update: vi.fn().mockImplementation(update) },
    } as unknown as PrismaClient;

    return new PrismaShopRepository(database);
  }

  const billingState = {
    plan: "PRO" as const,
    billingStatus: "ACTIVE",
    billingSyncedAt: installedAt,
    billingPeriodEnd: null,
  };

  it("returns null when the shop row is gone", async () => {
    const repository = createRepositoryWithUpdate(() =>
      Promise.reject(Object.assign(new Error("Record not found"), { code: "P2025" })),
    );

    await expect(
      repository.updateBillingState("shop-1", billingState),
    ).resolves.toBeNull();
  });

  it("rethrows other database failures", async () => {
    // Reporting a dropped connection as "shop not found" hid real faults behind
    // a misleading billing error.
    const outage = Object.assign(new Error("Connection reset"), { code: "P1001" });
    const repository = createRepositoryWithUpdate(() => Promise.reject(outage));

    await expect(
      repository.updateBillingState("shop-1", billingState),
    ).rejects.toBe(outage);
  });
});
