import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type ShopPlan = "FREE" | "PRO";
export type ShopStatus = "INSTALLED" | "UNINSTALLED";

export interface CreateShopRecordInput {
  shopDomain: string;
  shopifyShopId?: string;
  contactEmail?: string | null;
}

export interface InstallShopRecordInput {
  shopDomain: string;
  shopifyShopId?: string;
  contactEmail?: string | null;
}

export interface UpdateShopBillingStateInput {
  plan: ShopPlan;
  billingStatus: string;
  billingSyncedAt: Date;
}

export interface ShopRecord {
  id: string;
  shopDomain: string;
  shopifyShopId: string | null;
  plan: ShopPlan;
  status: ShopStatus;
  contactEmail: string | null;
  firstInstalledAt: Date;
  latestInstalledAt: Date;
  installedAt: Date;
  uninstalledAt: Date | null;
  billingStatus: string | null;
  billingSyncedAt: Date | null;
}

export interface ShopRepository {
  findById(shopId: string): Promise<ShopRecord | null>;
  findByDomain(shopDomain: string): Promise<ShopRecord | null>;
  create(input: CreateShopRecordInput): Promise<ShopRecord>;
  install(input: InstallShopRecordInput): Promise<ShopRecord>;
  markUninstalled(shopDomain: string): Promise<ShopRecord | null>;
  deleteByDomain(shopDomain: string): Promise<ShopRecord | null>;
  updateBillingState(
    shopId: string,
    input: UpdateShopBillingStateInput,
  ): Promise<ShopRecord | null>;
}

const SHOP_SELECT = {
  id: true,
  shopDomain: true,
  shopifyShopId: true,
  plan: true,
  status: true,
  contactEmail: true,
  firstInstalledAt: true,
  latestInstalledAt: true,
  installedAt: true,
  uninstalledAt: true,
  billingStatus: true,
  billingSyncedAt: true,
} as const;

type ShopModel = {
  findUnique(args: {
    where: { shopDomain: string } | { id: string };
    select: typeof SHOP_SELECT;
  }): Promise<ShopRecord | null>;
  create(args: {
    data: {
      shopDomain: string;
      shopifyShopId?: string;
      contactEmail?: string | null;
      firstInstalledAt?: Date;
      latestInstalledAt?: Date;
      installedAt?: Date;
    };
    select: typeof SHOP_SELECT;
  }): Promise<ShopRecord>;
  upsert(args: {
    where: { shopDomain: string };
    create: {
      shopDomain: string;
      shopifyShopId?: string;
      contactEmail?: string | null;
      status: ShopStatus;
      firstInstalledAt: Date;
      latestInstalledAt: Date;
      installedAt: Date;
      uninstalledAt: null;
    };
    update: {
      status: ShopStatus;
      latestInstalledAt: Date;
      installedAt: Date;
      uninstalledAt: null;
      shopifyShopId?: string;
      contactEmail?: string | null;
    };
    select: typeof SHOP_SELECT;
  }): Promise<ShopRecord>;
  update(args: {
    where: { shopDomain: string } | { id: string };
    data: {
      status?: ShopStatus;
      uninstalledAt?: Date;
      plan?: ShopPlan;
      billingStatus?: string;
      billingSyncedAt?: Date;
      contactEmail?: string | null;
    };
    select: typeof SHOP_SELECT;
  }): Promise<ShopRecord>;
  delete(args: {
    where: { shopDomain: string };
    select: typeof SHOP_SELECT;
  }): Promise<ShopRecord>;
};

function shopModel(database: PrismaClient): ShopModel {
  return (database as unknown as { shop: ShopModel }).shop;
}

export class PrismaShopRepository implements ShopRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async findById(shopId: string): Promise<ShopRecord | null> {
    return shopModel(this.database).findUnique({
      where: { id: shopId },
      select: SHOP_SELECT,
    });
  }

  async findByDomain(shopDomain: string): Promise<ShopRecord | null> {
    return shopModel(this.database).findUnique({
      where: { shopDomain },
      select: SHOP_SELECT,
    });
  }

  async create(input: CreateShopRecordInput): Promise<ShopRecord> {
    const now = new Date();

    return shopModel(this.database).create({
      data: {
        shopDomain: input.shopDomain,
        shopifyShopId: input.shopifyShopId,
        contactEmail: input.contactEmail ?? null,
        firstInstalledAt: now,
        latestInstalledAt: now,
        installedAt: now,
      },
      select: SHOP_SELECT,
    });
  }

  async install(input: InstallShopRecordInput): Promise<ShopRecord> {
    const now = new Date();

    return shopModel(this.database).upsert({
      where: { shopDomain: input.shopDomain },
      create: {
        shopDomain: input.shopDomain,
        shopifyShopId: input.shopifyShopId,
        contactEmail: input.contactEmail ?? null,
        status: "INSTALLED",
        firstInstalledAt: now,
        latestInstalledAt: now,
        installedAt: now,
        uninstalledAt: null,
      },
      update: {
        status: "INSTALLED",
        latestInstalledAt: now,
        installedAt: now,
        uninstalledAt: null,
        ...(input.shopifyShopId
          ? { shopifyShopId: input.shopifyShopId }
          : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: input.contactEmail }
          : {}),
      },
      select: SHOP_SELECT,
    });
  }

  async markUninstalled(shopDomain: string): Promise<ShopRecord | null> {
    const existing = await this.findByDomain(shopDomain);

    if (!existing) {
      return null;
    }

    if (existing.status === "UNINSTALLED") {
      return existing;
    }

    return shopModel(this.database).update({
      where: { shopDomain },
      data: {
        status: "UNINSTALLED",
        uninstalledAt: new Date(),
      },
      select: SHOP_SELECT,
    });
  }

  async deleteByDomain(shopDomain: string): Promise<ShopRecord | null> {
    const existing = await this.findByDomain(shopDomain);
    if (!existing) {
      return null;
    }

    return shopModel(this.database).delete({
      where: { shopDomain },
      select: SHOP_SELECT,
    });
  }

  async updateBillingState(
    shopId: string,
    input: UpdateShopBillingStateInput,
  ): Promise<ShopRecord | null> {
    try {
      return await shopModel(this.database).update({
        where: { id: shopId },
        data: {
          plan: input.plan,
          billingStatus: input.billingStatus,
          billingSyncedAt: input.billingSyncedAt,
        },
        select: SHOP_SELECT,
      });
    } catch {
      return null;
    }
  }
}

export const shopRepository = new PrismaShopRepository();
