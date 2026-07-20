import { DomainError } from "../../lib/domain-error";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import { reviewRepository } from "../../repositories/review.repository.server";

const FREE_MAX_PUBLISHED_REVIEWS = 100;

export interface BillingService {
  assertCanApprovePublishedReview(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void>;
}

export class BillingEntitlementsService implements BillingService {
  constructor(private readonly reviews: ReviewRepository) {}

  async assertCanApprovePublishedReview(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void> {
    if (input.shopPlan === "PRO") {
      return;
    }

    const approvedCount = await this.reviews.countApprovedForShop(
      input.shopId,
    );

    // Approving a review transitions it from non-public to public, so we
    // block when the current published count is already at the limit.
    if (approvedCount >= FREE_MAX_PUBLISHED_REVIEWS) {
      throw new DomainError(
        `Free plan allows up to ${FREE_MAX_PUBLISHED_REVIEWS} published reviews. Upgrade to Pro to approve more reviews.`,
        "PLAN_LIMIT_REACHED",
      );
    }
  }
}

export const billingEntitlementsService: BillingService =
  new BillingEntitlementsService(reviewRepository);

