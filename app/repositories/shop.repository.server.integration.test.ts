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
  const shopDomain = `phase-zero-${Date.now()}.myshopify.com`;

  afterAll(async () => {
    await database.shop.deleteMany({ where: { shopDomain } });
    await database.$disconnect();
  });

  it(
    "creates and finds a shop",
    async () => {
      const created = await repository.create({
        shopDomain,
        shopifyShopId: `gid://shopify/Shop/${Date.now()}`,
      });

      const found = await repository.findByDomain(shopDomain);

      expect(found).toEqual(created);
    },
    20_000,
  );
});
