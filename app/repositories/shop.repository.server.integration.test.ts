import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { PrismaShopRepository } from "./shop.repository.server";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("PrismaShopRepository integration", () => {
  if (!testDatabaseUrl) {
    return;
  }

  const database = new PrismaClient({
    datasourceUrl: testDatabaseUrl,
  });
  const repository = new PrismaShopRepository(database);
  const shopDomain = `phase-one-${Date.now()}.myshopify.com`;
  const shopifyShopId = `gid://shopify/Shop/${Date.now()}`;

  afterAll(async () => {
    await database.shop.deleteMany({ where: { shopDomain } });
    await database.$disconnect();
  });

  it(
    "creates, finds, reinstalls, and marks a shop uninstalled",
    async () => {
      const created = await repository.create({
        shopDomain,
        shopifyShopId,
      });

      const found = await repository.findByDomain(shopDomain);
      expect(found).toEqual(created);

      const uninstalled = await repository.markUninstalled(shopDomain);
      expect(uninstalled).toMatchObject({
        shopDomain,
        status: "UNINSTALLED",
      });
      expect(uninstalled?.uninstalledAt).toBeInstanceOf(Date);

      const reinstalled = await repository.install({
        shopDomain,
        shopifyShopId: `gid://shopify/Shop/${Date.now() + 1}`,
      });

      expect(reinstalled).toMatchObject({
        shopDomain,
        status: "INSTALLED",
        uninstalledAt: null,
      });
      expect(reinstalled.shopifyShopId).not.toBe(shopifyShopId);

      const secondUninstall = await repository.markUninstalled(shopDomain);
      expect(secondUninstall?.status).toBe("UNINSTALLED");
    },
    20_000,
  );
});