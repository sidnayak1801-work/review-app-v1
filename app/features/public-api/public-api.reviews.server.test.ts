import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReviewRepository } from "../../repositories/review.repository.server";
import type { BillingService } from "../billing/billing.service.server";
import { ReviewService } from "../reviews/review.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

const review = {
  id: "review-1",
  shopId: "shop-1",
  shopifyProductId: "gid://shopify/Product/1",
  productTitle: null,
  shopifyCustomerId: null,
  rating: 5,
  title: "Great",
  body: "Loved it",
  authorName: "Alex",
  authorEmail: "alex@example.com",
  status: "PENDING" as const,
  source: "API" as const,
  verifiedPurchase: false,
  featured: false,
  hasImage: false,
  hasVideo: false,
  merchantReply: null,
  merchantReplyAt: null,
  publishedAt: null,
  createdAt: new Date("2026-07-24T00:00:00.000Z"),
  updatedAt: new Date("2026-07-24T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn().mockResolvedValue(review),
    findByIdForShop: vi.fn(),
    findByIdsForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn(),
    list: vi.fn().mockResolvedValue({
      items: [{ ...review, status: "APPROVED", source: "STOREFRONT" }],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    listForStorefront: vi.fn().mockResolvedValue({
      items: [{ ...review, status: "APPROVED", source: "STOREFRONT" }],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    refreshMediaFlags: vi.fn(),
    listProductsForShop: vi.fn(),
    getProductStatsForShop: vi.fn(),
    getProductReviewTrendForShop: vi.fn(),
    getProductRatingTrendForShop: vi.fn(),
    countApprovedForShop: vi.fn(),
    countByStatusForShop: vi.fn(),
    averageApprovedRatingForShop: vi.fn(),
    getApprovedSummaryForShop: vi.fn().mockResolvedValue({
      approvedCount: 2,
      averageRating: 4.5,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    }),
    getShopReviewVolumeSeries: vi.fn().mockResolvedValue([]),
    updateForShop: vi.fn(),
    setProductTitlesForShop: vi.fn(),
    redactCustomerPii: vi.fn(),
    deleteForShop: vi.fn(),
    ...overrides,
  };
}

const billing: BillingService = {
  assertCanApprovePublishedReview: vi.fn(),
  getPublishedReviewUsage: vi.fn(),
  assertCanSendReviewRequest: vi.fn(),
  getReviewRequestUsage: vi.fn(),
};

describe("ReviewService public API methods", () => {
  it("lists approved reviews for the public API", async () => {
    const repository = createRepository();
    const service = new ReviewService(repository, billing);

    const result = await service.listApprovedForPublicApi("shop-1", {
      productId: "1",
      limit: "10",
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        status: "APPROVED",
        limit: 10,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty("authorEmail");
  });

  it("returns summary and rating aggregates", async () => {
    const repository = createRepository();
    const service = new ReviewService(repository, billing);

    const summary = await service.getPublicApiSummary("shop-1", {
      productId: "1",
    });
    const rating = await service.getPublicApiRating("shop-1", {
      productId: "1",
    });

    expect(summary.approvedCount).toBe(2);
    expect(summary.averageRating).toBe(4.5);
    expect(rating).toEqual({
      averageRating: 4.5,
      approvedCount: 2,
    });
  });

  it("creates pending reviews with source API", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new ReviewService(repository, billing);

    const created = await service.createPublicApiReview("shop-1", {
      shopifyProductId: "1",
      rating: 5,
      body: "Excellent product",
      authorName: "Alex",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "API",
        status: "PENDING",
        shopifyProductId: "gid://shopify/Product/1",
      }),
    );
    expect(created.status).toBe("PENDING");
    expect(created).not.toHaveProperty("authorEmail");
  });
});
