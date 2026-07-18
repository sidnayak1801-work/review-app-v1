import type {
  Prisma,
  PrismaClient,
  ShopPlan,
  ShopStatus,
} from "@prisma/client";

import prisma from "../db.server";

export interface CreateShopRecordInput {
  shopDomain: string;
  shopifyShopId?: string;
}

export interface ShopRecord {
  id: string;
  shopDomain: string;
  shopifyShopId: string | null;
  plan: ShopPlan;
  status: ShopStatus;
  installedAt: Date;
  uninstalledAt: Date | null;
}

export interface ShopRepository {
  findByDomain(shopDomain: string): Promise<ShopRecord | null>;
  create(input: CreateShopRecordInput): Promise<ShopRecord>;
}

const SHOP_SELECT = {
  id: true,
  shopDomain: true,
  shopifyShopId: true,
  plan: true,
  status: true,
  installedAt: true,
  uninstalledAt: true,
} satisfies Prisma.ShopSelect;

export class PrismaShopRepository implements ShopRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async findByDomain(shopDomain: string): Promise<ShopRecord | null> {
    return this.database.shop.findUnique({
      where: { shopDomain },
      select: SHOP_SELECT,
    });
  }

  async create(input: CreateShopRecordInput): Promise<ShopRecord> {
    return this.database.shop.create({
      data: {
        shopDomain: input.shopDomain,
        shopifyShopId: input.shopifyShopId,
      },
      select: SHOP_SELECT,
    });
  }
}

export const shopRepository = new PrismaShopRepository();
