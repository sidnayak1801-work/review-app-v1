import { describe, expect, it, vi } from "vitest";

import { ProductInsightsService } from "./product-insights.service.server";
import type { ReviewRepository } from "../../repositories/review.repository.server";

function createReviewsMock(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn(),
    findByIdForShop: vi.fn(),
    findByIdsForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    listForStorefront: vi.fn().mockResolvedValue({
      items: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    refreshMediaFlags: vi.fn(),
    listProductsForShop: vi.fn().mockResolvedValue({
      items: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    getProductStatsForShop: vi.fn().mockResolvedValue({
      totalReviews: 0,
      pendingReviews: 0,
      approvedReviews: 0,
      rejectedReviews: 0,
      reviewsWithMedia: 0,
      averageApprovedRating: null,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
    getProductReviewTrendForShop: vi.fn().mockResolvedValue([]),
    getProductRatingTrendForShop: vi.fn().mockResolvedValue([]),
    countApprovedForShop: vi.fn(),
    countByStatusForShop: vi.fn(),
    averageApprovedRatingForShop: vi.fn(),
    getApprovedSummaryForShop: vi.fn(),
    getShopReviewVolumeSeries: vi.fn().mockResolvedValue([]),
    updateForShop: vi.fn(),
    setProductTitlesForShop: vi.fn(),
    redactCustomerPii: vi.fn(),
    deleteForShop: vi.fn(),
    ...overrides,
  };
}

describe("ProductInsightsService", () => {
  it("builds product detail with trends and no sample AI insights", async () => {
    const volumeTrend = [
      { monthKey: "2026-06", label: "Jun", count: 0 },
      { monthKey: "2026-07", label: "Jul", count: 2 },
    ];
    const ratingTrend = [
      { monthKey: "2026-06", label: "Jun", averageRating: null },
      { monthKey: "2026-07", label: "Jul", averageRating: 5 },
    ];
    const reviews = createReviewsMock({
      getProductStatsForShop: vi.fn().mockResolvedValue({
        totalReviews: 2,
        pendingReviews: 0,
        approvedReviews: 2,
        rejectedReviews: 0,
        reviewsWithMedia: 1,
        averageApprovedRating: 5,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 },
      }),
      getProductReviewTrendForShop: vi.fn().mockResolvedValue(volumeTrend),
      getProductRatingTrendForShop: vi.fn().mockResolvedValue(ratingTrend),
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: "r1",
            shopId: "shop_1",
            shopifyProductId: "gid://shopify/Product/222",
            productTitle: null,
            shopifyCustomerId: null,
            rating: 5,
            title: null,
            body: "Great",
            authorName: "Ada",
            authorEmail: null,
            status: "APPROVED",
            source: "STOREFRONT",
            verifiedPurchase: false,
            featured: false,
            hasImage: false,
            hasVideo: false,
            merchantReply: null,
            merchantReplyAt: null,
            publishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    });

    const admin = {
      graphql: vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            nodes: [
              {
                id: "gid://shopify/Product/222",
                title: "The Complete Snowboard",
                handle: "the-complete-snowboard",
                status: "ACTIVE",
                vendor: "Snowboard Vendor",
                productType: "snowboard",
                tags: ["Winter"],
                featuredImage: {
                  url: "https://cdn.example/snowboard.jpg",
                  altText: "Snowboard",
                },
              },
            ],
          },
        }),
      }),
    };

    const service = new ProductInsightsService(reviews);
    const detail = await service.getDetailForShop("shop_1", admin, "222");

    expect(detail.title).toBe("The Complete Snowboard");
    expect(detail.volumeTrend).toEqual(volumeTrend);
    expect(detail.ratingTrend).toEqual(ratingTrend);
    expect(detail.insights).toEqual([]);
    expect(detail.hasAnyReviews).toBe(true);
  });

  it("rejects invalid product ids", async () => {
    const service = new ProductInsightsService(createReviewsMock());
    const admin = { graphql: vi.fn() };

    await expect(
      service.getDetailForShop("shop_1", admin, "not-a-product"),
    ).rejects.toThrow("Invalid product id");
  });
});
