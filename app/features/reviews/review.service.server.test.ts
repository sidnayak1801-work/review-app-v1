import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ReviewRecord,
  ReviewRepository,
} from "../../repositories/review.repository.server";
import { ReviewService } from "./review.service.server";

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
    list: vi.fn().mockResolvedValue({
      items: [review],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
    countApprovedForShop: vi.fn().mockResolvedValue(0),
    updateForShop: vi.fn().mockResolvedValue(review),
    deleteForShop: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("ReviewService", () => {
  it("creates a merchant review as approved by default", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const billing = {
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValue(undefined),
    };
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
    const billing = {
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValue(undefined),
    };
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
    const billing = {
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValue(undefined),
    };
    const service = new ReviewService(repository, billing);

    await expect(
      service.createStorefrontReview("shop-1", {
        shopifyProductId: "1",
        rating: 5,
        body: "Spam",
        authorName: "Bot",
        website: "https://spam.example",
      }),
    ).rejects.toThrow("Invalid review");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not call billing when updating an already approved review", async () => {
    const repository = createRepository();
    const billing = {
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValue(undefined),
    };
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

    const billing = {
      assertCanApprovePublishedReview: vi
        .fn()
        .mockResolvedValue(undefined),
    };
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
});
