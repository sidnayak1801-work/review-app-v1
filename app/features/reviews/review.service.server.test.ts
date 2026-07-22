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
  shopifyCustomerId: null,
  rating: 5,
  title: "Great",
  body: "Loved it",
  authorName: "Alex",
  authorEmail: null,
  status: "APPROVED",
  source: "MERCHANT",
  verifiedPurchase: false,
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
    countApprovedForShop: vi.fn().mockResolvedValue(0),
    countByStatusForShop: vi.fn().mockResolvedValue({
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 0,
    }),
    updateForShop: vi.fn().mockResolvedValue(review),
    redactCustomerPii: vi.fn().mockResolvedValue(0),
    deleteForShop: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("ReviewService", () => {
  it("creates a merchant review as approved by default", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

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

  it("lists only approved reviews for the storefront", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

    const result = await service.listApprovedForStorefront("shop-1", {
      shopifyProductId: "1",
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        status: "APPROVED",
        shopifyProductId: "gid://shopify/Product/1",
      }),
    );
    expect(result.items[0]).not.toHaveProperty("authorEmail");
  });

  it("rejects honeypot storefront submissions", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

    await expect(
      service.createStorefrontReview(
        "shop-1",
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

  it("rejects storefront submissions without a customer id", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

    await expect(
      service.createStorefrontReview(
        "shop-1",
        {
          shopifyProductId: "1",
          rating: 5,
          body: "Great product",
          authorName: "Ada",
          authorEmail: "ada@example.com",
        },
        { shopifyCustomerId: "  " },
      ),
    ).rejects.toThrow("Sign in required");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("persists shopifyCustomerId and authorEmail on storefront create", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

    await service.createStorefrontReview(
      "shop-1",
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

  it("does not call billing when updating an already approved review", async () => {
    const repository = createRepository();
    const billing = createBilling();
    const service = new ReviewService(repository, billing);

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
    const service = new ReviewService(repository, billing);

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
    const service = new ReviewService(repository, billing);

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
    const service = new ReviewService(repository, billing);

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
    const service = new ReviewService(repository, billing);

    const result = await service.bulkUpdateStatusForShop("shop-1", "FREE", {
      reviewIds: ["review-1"],
      status: "APPROVED",
    });

    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(repository.updateForShop).not.toHaveBeenCalled();
    expect(billing.assertCanApprovePublishedReview).not.toHaveBeenCalled();
  });
});
