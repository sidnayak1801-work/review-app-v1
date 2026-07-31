import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";
import { normalizeShopifyProductId } from "../lib/shopify-ids";

export type ProductRatingSummaryRecord = {
  id: string;
  shopId: string;
  shopifyProductId: string;
  averageRating: number | null;
  totalReviews: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  updatedAt: Date;
  createdAt: Date;
};

export type StorefrontProductSummary = {
  productId: string;
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export interface ProductRatingSummaryRepository {
  getForProduct(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductRatingSummaryRecord | null>;
  recomputeForProduct(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductRatingSummaryRecord>;
  getStorefrontSummary(
    shopId: string,
    shopifyProductId: string,
  ): Promise<StorefrontProductSummary>;
}

const SUMMARY_SELECT = {
  id: true,
  shopId: true,
  shopifyProductId: true,
  averageRating: true,
  totalReviews: true,
  fiveStar: true,
  fourStar: true,
  threeStar: true,
  twoStar: true,
  oneStar: true,
  updatedAt: true,
  createdAt: true,
} as const;

function toCanonicalProductId(shopifyProductId: string): string {
  return normalizeShopifyProductId(shopifyProductId.trim());
}

function toStorefrontSummary(
  record: ProductRatingSummaryRecord,
): StorefrontProductSummary {
  return {
    productId: record.shopifyProductId,
    averageRating: record.averageRating,
    totalReviews: record.totalReviews,
    distribution: {
      "5": record.fiveStar,
      "4": record.fourStar,
      "3": record.threeStar,
      "2": record.twoStar,
      "1": record.oneStar,
    },
  };
}

export class PrismaProductRatingSummaryRepository
  implements ProductRatingSummaryRepository
{
  constructor(private readonly database: PrismaClient = prisma) {}

  async getForProduct(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductRatingSummaryRecord | null> {
    const productId = toCanonicalProductId(shopifyProductId);
    return this.database.productRatingSummary.findUnique({
      where: {
        shopId_shopifyProductId: { shopId, shopifyProductId: productId },
      },
      select: SUMMARY_SELECT,
    });
  }

  async recomputeForProduct(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductRatingSummaryRecord> {
    const productId = toCanonicalProductId(shopifyProductId);
    const where = {
      shopId,
      shopifyProductId: productId,
      status: "APPROVED" as const,
    };

    const [aggregate, ratingRows] = await Promise.all([
      this.database.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.database.review.groupBy({
        by: ["rating"],
        where,
        _count: { _all: true },
      }),
    ]);

    const distribution = {
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };

    for (const row of ratingRows) {
      const count = row._count._all;
      switch (row.rating) {
        case 5:
          distribution.fiveStar = count;
          break;
        case 4:
          distribution.fourStar = count;
          break;
        case 3:
          distribution.threeStar = count;
          break;
        case 2:
          distribution.twoStar = count;
          break;
        case 1:
          distribution.oneStar = count;
          break;
        default:
          break;
      }
    }

    const totalReviews = aggregate._count._all;
    const averageRating =
      aggregate._avg.rating == null
        ? null
        : Math.round(aggregate._avg.rating * 10) / 10;

    return this.database.productRatingSummary.upsert({
      where: {
        shopId_shopifyProductId: { shopId, shopifyProductId: productId },
      },
      create: {
        shopId,
        shopifyProductId: productId,
        averageRating,
        totalReviews,
        ...distribution,
      },
      update: {
        averageRating,
        totalReviews,
        ...distribution,
      },
      select: SUMMARY_SELECT,
    });
  }

  async getStorefrontSummary(
    shopId: string,
    shopifyProductId: string,
  ): Promise<StorefrontProductSummary> {
    const productId = toCanonicalProductId(shopifyProductId);
    const existing = await this.getForProduct(shopId, productId);
    if (existing) {
      return toStorefrontSummary(existing);
    }

    const recomputed = await this.recomputeForProduct(shopId, productId);
    return toStorefrontSummary(recomputed);
  }
}

export const productRatingSummaryRepository =
  new PrismaProductRatingSummaryRepository();
