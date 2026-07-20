import { describe, expect, it, vi } from "vitest";

import { BillingEntitlementsService } from "./billing.service.server";
import type {
  ReviewRepository,
} from "../../repositories/review.repository.server";

function createBillingService(approvedCount: number) {
  const repository = {
    countApprovedForShop: vi.fn().mockResolvedValue(approvedCount),
  } as unknown as ReviewRepository;

  return new BillingEntitlementsService(repository);
}

describe("BillingEntitlementsService", () => {
  it("allows approving when on FREE and approved count is below the limit", async () => {
    const service = createBillingService(99);

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "FREE",
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks approving when on FREE and approved count hits the limit", async () => {
    const service = createBillingService(100);

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

  it("allows approving when on PRO below the limit", async () => {
    const service = createBillingService(4_999);

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toBeUndefined();
  });

  it("returns published review usage for Free plans", async () => {
    const service = createBillingService(42);

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

  it("blocks approving when on PRO and approved count hits the limit", async () => {
    const service = createBillingService(5_000);

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "PLAN_LIMIT_REACHED",
    });
  });

  it("returns published review usage for Pro plans", async () => {
    const service = createBillingService(250);

    await expect(
      service.getPublishedReviewUsage({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toEqual({
      used: 250,
      limit: 5_000,
    });
  });
});

