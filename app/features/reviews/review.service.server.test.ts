import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ReviewRecord,
  ReviewRepository,
} from "../../repositories/review.repository.server";
import { DomainError } from "../../lib/domain-error";
import type { BillingService } from "../billing/billing.service.server";
import { ReviewService } from "./review.service.server";

function createBilling(
  overrides: Partial<BillingService> = {},
): BillingService {
  return {
    assertCanApprovePublishedReview: vi
      .fn()
      .mockResolvedValue(undefined),
    getPublishedReviewUsage: vi.fn().mockResolvedValue({
      used: 0,
      limit: 100,
    }),
    assertCanSendReviewRequest: vi.fn().mockResolvedValue(undefined),
    getReviewRequestUsage: vi.fn().mockResolvedValue({
      used: 0,
      limit: 50,
      monthLabel: "2026-07",
    }),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

const review: ReviewRecord = {
  id: "review-1",
  shopId: "shop-1",
  shopifyProductId: "gid://shopify/Product/1",
  productTitle: null,
  shopifyCustomerId: null,
  rating: 5,
  title: "Great",
  body: "Loved it",
  authorName: "Alex",
  authorEmail: null,
  status: "APPROVED",
  source: "MERCHANT",
  verifiedPurchase: false,
  featured: false,
  hasImage: false,
  hasVideo: false,
  merchantReply: null,
  merchantReplyAt: null,
  publishedAt: new Date("2026-07-18T00:00:00.000Z"),
  createdAt: new Date("2026-07-18T00:00:00.000Z"),
  updatedAt: new Date("2026-07-18T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn().mockResolvedValue(review),
    findByIdForShop: vi.fn().mockResolvedValue(review),
    findByIdsForShop: vi.fn().mockResolvedValue([review]),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue({
      items: [review],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    listForStorefront: vi.fn().mockResolvedValue({
      items: [review],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    refreshMediaFlags: vi.fn().mockResolvedValue(undefined),
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
    countApprovedForShop: vi.fn().mockResolvedValue(0),
    countByStatusForShop: vi.fn().mockResolvedValue({
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 0,
    }),
    averageApprovedRatingForShop: vi.fn().mockResolvedValue(5),
    getApprovedSummaryForShop: vi.fn().mockResolvedValue({
      approvedCount: 1,
      averageRating: 5,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    }),
    getShopReviewVolumeSeries: vi.fn().mockResolvedValue([]),
    updateForShop: vi.fn().mockResolvedValue(review),
    setProductTitlesForShop: vi.fn().mockResolvedValue(0),
    redactCustomerPii: vi.fn().mockResolvedValue(0),
    deleteForShop: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const noopIntegrations = {
  emit: vi.fn().mockResolvedValue(undefined),
  emitInBackground: vi.fn(),
};

describe("ReviewService", () => {
  it("creates a merchant review as approved by default", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(
      repository,
      billing,
      undefined,
      noopIntegrations as never,
    );

    await service.createMerchantReview("shop-1", "FREE", {
      shopifyProductId: "1",
      rating: 5,
      body: "Loved it",
      authorName: "Alex",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        shopifyProductId: "gid://shopify/Product/1",
        status: "APPROVED",
        source: "MERCHANT",
      }),
    );

    expect(billing.assertCanApprovePublishedReview).toHaveBeenCalledWith({
      shopId: "shop-1",
      shopPlan: "FREE",
    });
  });

  it("passes free-text search to the repository list", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(
      repository,
      billing,
      undefined,
      noopIntegrations as never,
    );

    await service.listForShop("shop-1", {
      q: "virat kohli",
      limit: 20,
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        query: "virat kohli",
        limit: 20,
      }),
    );
  });

  it("lists only approved reviews for the storefront", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn().mockResolvedValue([]),
      listGroupedForReviews: vi.fn().mockResolvedValue(new Map()),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    const result = await service.listApprovedForStorefront("shop-1", {
      shopifyProductId: "1",
    });

    expect(repository.listForStorefront).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        sort: "most_recent",
        shopifyProductId: "gid://shopify/Product/1",
      }),
    );
    expect(result.items[0]).not.toHaveProperty("authorEmail");
    expect(result.items[0]).toMatchObject({
      featured: false,
      merchantReply: null,
      merchantReplyAt: null,
    });
  });

  it("sorts featured storefront reviews first within a page", async () => {
    const olderFeatured: ReviewRecord = {
      ...review,
      id: "review-featured",
      featured: true,
      merchantReply: "Thanks for the feedback!",
      merchantReplyAt: new Date("2026-07-19T00:00:00.000Z"),
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
    };
    const newer: ReviewRecord = {
      ...review,
      id: "review-newer",
      featured: false,
      createdAt: new Date("2026-07-18T00:00:00.000Z"),
    };
    const repository = createRepository({
      listForStorefront: vi.fn().mockResolvedValue({
        items: [newer, olderFeatured],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    });
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn().mockResolvedValue([]),
      listGroupedForReviews: vi.fn().mockResolvedValue(new Map()),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    const result = await service.listApprovedForStorefront("shop-1", {
      shopifyProductId: "1",
      sort: "most_recent",
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "review-featured",
      "review-newer",
    ]);
    expect(result.items[0]).toMatchObject({
      featured: true,
      merchantReply: "Thanks for the feedback!",
      merchantReplyAt: "2026-07-19T00:00:00.000Z",
    });
  });

  it("does not featured-bump when a non-default storefront sort is active", async () => {
    const olderFeatured: ReviewRecord = {
      ...review,
      id: "review-featured",
      featured: true,
      rating: 3,
      createdAt: new Date("2026-07-10T00:00:00.000Z"),
    };
    const newerHigh: ReviewRecord = {
      ...review,
      id: "review-high",
      featured: false,
      rating: 5,
      createdAt: new Date("2026-07-18T00:00:00.000Z"),
    };
    const repository = createRepository({
      listForStorefront: vi.fn().mockResolvedValue({
        items: [newerHigh, olderFeatured],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    });
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn().mockResolvedValue([]),
      listGroupedForReviews: vi.fn().mockResolvedValue(new Map()),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      createBilling(),
      media as never,
      noopIntegrations as never,
    );

    const result = await service.listApprovedForStorefront("shop-1", {
      shopifyProductId: "1",
      sort: "highest_rating",
    });

    expect(repository.listForStorefront).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "highest_rating" }),
    );
    expect(result.items.map((item) => item.id)).toEqual([
      "review-high",
      "review-featured",
    ]);
  });

  it("passes only_pictures sort through to the storefront list", async () => {
    const repository = createRepository();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn().mockResolvedValue([]),
      listGroupedForReviews: vi.fn().mockResolvedValue(new Map()),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      createBilling(),
      media as never,
      noopIntegrations as never,
    );

    await service.listApprovedForStorefront("shop-1", {
      shopifyProductId: "1",
      sort: "only_pictures",
    });

    expect(repository.listForStorefront).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "only_pictures",
        shopifyProductId: "gid://shopify/Product/1",
      }),
    );
  });

  it("rejects honeypot storefront submissions", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn(),
      listGroupedForReviews: vi.fn(),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    await expect(
      service.createStorefrontReview(
        "shop-1",
        "FREE",
        {
          shopifyProductId: "1",
          rating: 5,
          body: "Spam",
          authorName: "Bot",
          authorEmail: "bot@example.com",
          website: "https://spam.example",
        },
        { shopifyCustomerId: "123" },
      ),
    ).rejects.toThrow("Invalid review");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("allows guest storefront submissions without a customer id", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn(),
      listGroupedForReviews: vi.fn(),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    await service.createStorefrontReview("shop-1", "FREE", {
      shopifyProductId: "1",
      productTitle: "The Collection Snowboard",
      rating: 5,
      body: "Great product",
      authorName: "Ada",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopifyCustomerId: undefined,
        authorName: "Ada",
        productTitle: "The Collection Snowboard",
        source: "STOREFRONT",
        status: "PENDING",
      }),
    );
  });

  it("persists shopifyCustomerId and authorEmail on storefront create", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn(),
      listGroupedForReviews: vi.fn(),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    await service.createStorefrontReview(
      "shop-1",
      "FREE",
      {
        shopifyProductId: "1",
        rating: 5,
        body: "Great product",
        authorName: "Ada",
        authorEmail: "ada@example.com",
      },
      { shopifyCustomerId: "998877" },
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopifyCustomerId: "998877",
        authorEmail: "ada@example.com",
        authorName: "Ada",
        source: "STOREFRONT",
        status: "PENDING",
      }),
    );
  });

  it("auto-publishes storefront reviews when enabled and under plan limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository({
      create: vi.fn().mockResolvedValue({
        ...review,
        status: "APPROVED",
        source: "STOREFRONT",
      }),
    });
    const billing = createBilling();
    const media = {
      resolveForAttach: vi.fn().mockResolvedValue([]),
      attachToReview: vi.fn(),
      listForReviews: vi.fn(),
      listGroupedForReviews: vi.fn(),
      uploadForShop: vi.fn(),
    };
    const service = new ReviewService(
      repository,
      billing,
      media as never,
      noopIntegrations as never,
    );

    await service.createStorefrontReview(
      "shop-1",
      "FREE",
      {
        shopifyProductId: "1",
        rating: 5,
        body: "Great product",
        authorName: "Ada",
      },
      { autoPublish: true },
    );

    expect(billing.assertCanApprovePublishedReview).toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "APPROVED",
        publishedAt: expect.any(Date),
      }),
    );
  });

  it("does not call billing when updating an already approved review", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing, undefined, noopIntegrations as never);

    await service.updateForShop(
      "shop-1",
      "FREE",
      "review-1",
      { status: "APPROVED" },
    );

    expect(billing.assertCanApprovePublishedReview).not.toHaveBeenCalled();
  });

  it("calls billing when transitioning a review to approved", async () => {
    const pendingReview: ReviewRecord = {
      ...review,
      status: "PENDING",
      publishedAt: null,
    };

    const repository = createRepository({
      findByIdForShop: vi.fn().mockResolvedValue(pendingReview),
      updateForShop: vi.fn().mockResolvedValue({
        ...review,
        status: "APPROVED",
        publishedAt: new Date("2026-07-18T00:00:00.000Z"),
      }),
    });

    const billing = createBilling();
    const service = new ReviewService(repository, billing, undefined, noopIntegrations as never);

    await service.updateForShop(
      "shop-1",
      "FREE",
      "review-1",
      { status: "APPROVED" },
    );

    expect(billing.assertCanApprovePublishedReview).toHaveBeenCalledWith({
      shopId: "shop-1",
      shopPlan: "FREE",
    });

    expect(repository.updateForShop).toHaveBeenCalledWith(
      "shop-1",
      "review-1",
      expect.objectContaining({
        status: "APPROVED",
        publishedAt: expect.any(Date),
      }),
    );
  });

  it("bulk rejects pending reviews without billing checks", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const pendingReview: ReviewRecord = {
      ...review,
      id: "review-pending",
      status: "PENDING",
      publishedAt: null,
    };

    const repository = createRepository({
      findByIdsForShop: vi.fn().mockResolvedValue([pendingReview]),
      updateForShop: vi.fn().mockResolvedValue({
        ...pendingReview,
        status: "REJECTED",
        publishedAt: null,
      }),
    });

    const billing = createBilling();
    const service = new ReviewService(repository, billing, undefined, noopIntegrations as never);

    const result = await service.bulkUpdateStatusForShop("shop-1", "FREE", {
      reviewIds: ["review-pending"],
      status: "REJECTED",
    });

    expect(result.updatedCount).toBe(1);
    expect(billing.assertCanApprovePublishedReview).not.toHaveBeenCalled();
  });

  it("bulk approves until the Free plan limit is reached", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const pendingReviews: ReviewRecord[] = [
      {
        ...review,
        id: "review-2",
        status: "PENDING",
        publishedAt: null,
      },
      {
        ...review,
        id: "review-3",
        status: "PENDING",
        publishedAt: null,
      },
    ];

    const repository = createRepository({
      findByIdsForShop: vi.fn().mockResolvedValue(pendingReviews),
      updateForShop: vi
        .fn()
        .mockImplementation(async (_shopId, reviewId, input) => ({
          ...pendingReviews.find((item) => item.id === reviewId)!,
          status: input.status ?? "APPROVED",
          publishedAt: input.publishedAt ?? new Date(),
        })),
    });

    const billing = createBilling({
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
          new DomainError(
            "Free plan allows up to 100 published reviews. Upgrade to Pro to approve more reviews.",
            "PLAN_LIMIT_REACHED",
          ),
        ),
    });
    const service = new ReviewService(repository, billing, undefined, noopIntegrations as never);

    const result = await service.bulkUpdateStatusForShop("shop-1", "FREE", {
      reviewIds: ["review-2", "review-3"],
      status: "APPROVED",
    });

    expect(result.updatedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(billing.assertCanApprovePublishedReview).toHaveBeenCalledTimes(2);
  });

  it("skips already approved reviews during bulk approve", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const repository = createRepository({
      findByIdsForShop: vi.fn().mockResolvedValue([review]),
    });

    const billing = createBilling();
    const service = new ReviewService(repository, billing, undefined, noopIntegrations as never);

    const result = await service.bulkUpdateStatusForShop("shop-1", "FREE", {
      reviewIds: ["review-1"],
      status: "APPROVED",
    });

    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(repository.updateForShop).not.toHaveBeenCalled();
    expect(billing.assertCanApprovePublishedReview).not.toHaveBeenCalled();
  });

  it("sets featured without changing status", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository({
      updateForShop: vi.fn().mockResolvedValue({
        ...review,
        featured: true,
      }),
    });
    const service = new ReviewService(repository, createBilling(), undefined, noopIntegrations as never);

    const updated = await service.setFeaturedForShop("shop-1", {
      reviewId: "review-1",
      featured: true,
    });

    expect(repository.updateForShop).toHaveBeenCalledWith("shop-1", "review-1", {
      featured: true,
    });
    expect(updated.featured).toBe(true);
  });

  it("saves and clears merchant replies", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository({
      updateForShop: vi
        .fn()
        .mockResolvedValueOnce({
          ...review,
          merchantReply: "Thanks!",
          merchantReplyAt: new Date(),
        })
        .mockResolvedValueOnce({
          ...review,
          merchantReply: null,
          merchantReplyAt: null,
        }),
    });
    const service = new ReviewService(repository, createBilling(), undefined, noopIntegrations as never);

    await service.setMerchantReplyForShop("shop-1", {
      reviewId: "review-1",
      merchantReply: "Thanks!",
    });
    expect(repository.updateForShop).toHaveBeenCalledWith(
      "shop-1",
      "review-1",
      expect.objectContaining({
        merchantReply: "Thanks!",
        merchantReplyAt: expect.any(Date),
      }),
    );

    await service.setMerchantReplyForShop("shop-1", {
      reviewId: "review-1",
      merchantReply: "",
    });
    expect(repository.updateForShop).toHaveBeenLastCalledWith(
      "shop-1",
      "review-1",
      {
        merchantReply: null,
        merchantReplyAt: null,
      },
    );
  });

  it("rejects merchant replies longer than 1000 characters", async () => {
    const repository = createRepository();
    const service = new ReviewService(repository, createBilling(), undefined, noopIntegrations as never);

    await expect(
      service.setMerchantReplyForShop("shop-1", {
        reviewId: "review-1",
        merchantReply: "x".repeat(1001),
      }),
    ).rejects.toThrow(/Invalid/);
    expect(repository.updateForShop).not.toHaveBeenCalled();
  });
});
