import { describe, expect, it, vi } from "vitest";

import { PrismaProductRatingSummaryRepository } from "./product-rating-summary.repository.server";

describe("PrismaProductRatingSummaryRepository", () => {
  it("maps aggregate counts into storefront distribution keys", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "s1",
      shopId: "shop-1",
      shopifyProductId: "gid://shopify/Product/123",
      averageRating: 4.5,
      totalReviews: 4,
      fiveStar: 2,
      fourStar: 1,
      threeStar: 1,
      twoStar: 0,
      oneStar: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    });

    const database = {
      review: {
        aggregate: vi.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 4 },
        }),
        groupBy: vi.fn().mockResolvedValue([
          { rating: 5, _count: { _all: 2 } },
          { rating: 4, _count: { _all: 1 } },
          { rating: 3, _count: { _all: 1 } },
        ]),
      },
      productRatingSummary: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert,
      },
    };

    const repo = new PrismaProductRatingSummaryRepository(database as never);
    const summary = await repo.getStorefrontSummary("shop-1", "123");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          shopifyProductId: "gid://shopify/Product/123",
          totalReviews: 4,
          fiveStar: 2,
          fourStar: 1,
          threeStar: 1,
          averageRating: 4.5,
        }),
      }),
    );
    expect(summary).toEqual({
      productId: "gid://shopify/Product/123",
      averageRating: 4.5,
      totalReviews: 4,
      distribution: { "5": 2, "4": 1, "3": 1, "2": 0, "1": 0 },
    });
  });

  it("returns cached row without recomputing when present", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "s1",
      shopId: "shop-1",
      shopifyProductId: "gid://shopify/Product/123",
      averageRating: 5,
      totalReviews: 1,
      fiveStar: 1,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    const aggregate = vi.fn();

    const repo = new PrismaProductRatingSummaryRepository({
      review: { aggregate, groupBy: vi.fn() },
      productRatingSummary: { findUnique, upsert: vi.fn() },
    } as never);

    const summary = await repo.getStorefrontSummary("shop-1", "123");

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shopId_shopifyProductId: {
            shopId: "shop-1",
            shopifyProductId: "gid://shopify/Product/123",
          },
        },
      }),
    );
    expect(aggregate).not.toHaveBeenCalled();
    expect(summary.totalReviews).toBe(1);
    expect(summary.distribution["5"]).toBe(1);
  });
});
