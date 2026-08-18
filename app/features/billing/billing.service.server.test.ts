import { describe, expect, it, vi } from "vitest";

import type { ReviewRepository } from "../../repositories/review.repository.server";
import type { ReviewRequestRepository } from "../../repositories/review-request.repository.server";
import { BillingEntitlementsService } from "./billing.service.server";

function createBillingService(input: {
  approvedCount?: number;
  sentRequestCount?: number;
}) {
  const reviews = {
    countApprovedForShop: vi
      .fn()
      .mockResolvedValue(input.approvedCount ?? 0),
  } as unknown as ReviewRepository;

  const reviewRequests = {
    countSentForShopInUtcMonth: vi
      .fn()
      .mockResolvedValue(input.sentRequestCount ?? 0),
  } as unknown as ReviewRequestRepository;

  return new BillingEntitlementsService(reviews, reviewRequests);
}

describe("BillingEntitlementsService", () => {
  it("allows approving when on FREE and approved count is below the limit", async () => {
    const service = createBillingService({ approvedCount: 99 });

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks approving when on FREE and approved count hits the limit", async () => {
    const service = createBillingService({ approvedCount: 100 });

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "PLAN_LIMIT_REACHED",
    });
  });

  it("allows approving when on PRO at or above the former numeric cap", async () => {
    const service = createBillingService({ approvedCount: 5_000 });

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toBeUndefined();
  });

  it("returns published review usage for Free plans", async () => {
    const service = createBillingService({ approvedCount: 42 });

    await expect(
      service.getPublishedReviewUsage({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).resolves.toEqual({
      used: 42,
      limit: 100,
    });
  });

  it("returns published review usage for Pro plans as unlimited", async () => {
    const service = createBillingService({ approvedCount: 250 });

    await expect(
      service.getPublishedReviewUsage({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toEqual({
      used: 250,
      limit: null,
    });
  });

  it("blocks review-request sends when Free monthly allowance is reached", async () => {
    const service = createBillingService({ sentRequestCount: 100 });

    await expect(
      service.assertCanSendReviewRequest({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "REVIEW_REQUEST_LIMIT_REACHED",
    });
  });

  it("allows review-request sends on Free below the monthly allowance", async () => {
    const service = createBillingService({ sentRequestCount: 99 });

    await expect(
      service.assertCanSendReviewRequest({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).resolves.toBeUndefined();
  });

  it("allows review-request sends on Pro at high usage", async () => {
    const service = createBillingService({ sentRequestCount: 5_000 });

    await expect(
      service.assertCanSendReviewRequest({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toBeUndefined();
  });

  it("returns review-request usage for Pro plans as unlimited", async () => {
    const service = createBillingService({ sentRequestCount: 120 });

    const usage = await service.getReviewRequestUsage({
      shopId: "shop-1",
      shopPlan: "PRO",
    });

    expect(usage.used).toBe(120);
    expect(usage.limit).toBeNull();
    expect(usage.monthLabel).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns review-request usage for Free plans", async () => {
    const service = createBillingService({ sentRequestCount: 12 });

    const usage = await service.getReviewRequestUsage({
      shopId: "shop-1",
      shopPlan: "FREE",
    });

    expect(usage.used).toBe(12);
    expect(usage.limit).toBe(100);
    expect(usage.monthLabel).toMatch(/^\d{4}-\d{2}$/);
  });
});
