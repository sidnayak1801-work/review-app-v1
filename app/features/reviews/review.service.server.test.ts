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
    updateForShop: vi.fn().mockResolvedValue(review),
    deleteForShop: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("ReviewService", () => {
  it("creates a merchant review as approved by default", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository();
    const service = new ReviewService(repository);

    await service.createMerchantReview("shop-1", {
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
  });

  it("lists only approved reviews for the storefront", async () => {
    const repository = createRepository();
    const service = new ReviewService(repository);

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
    const service = new ReviewService(repository);

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
});
