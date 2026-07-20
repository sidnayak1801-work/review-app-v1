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

  it("allows approving when on PRO", async () => {
    const service = createBillingService(10_000);

    await expect(
      service.assertCanApprovePublishedReview({
        shopId: "shop-1",
        shopPlan: "PRO",
      }),
    ).resolves.toBeUndefined();
  });
});

