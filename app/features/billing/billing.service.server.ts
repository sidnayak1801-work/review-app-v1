import { DomainError } from "../../lib/domain-error";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import { reviewRepository } from "../../repositories/review.repository.server";
import {
  FREE_MAX_PUBLISHED_REVIEWS,
  getPublishedReviewLimit,
  PRO_MAX_PUBLISHED_REVIEWS,
} from "./billing.constants";

export { getPublishedReviewLimit };

export interface PublishedReviewUsage {
  used: number;
  limit: number | null;
}

export interface BillingService {
  assertCanApprovePublishedReview(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void>;
  getPublishedReviewUsage(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<PublishedReviewUsage>;
}

export class BillingEntitlementsService implements BillingService {
  constructor(private readonly reviews: ReviewRepository) {}

  async assertCanApprovePublishedReview(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void> {
    const limit = getPublishedReviewLimit(input.shopPlan);

    if (limit === null) {
      return;
    }

    const approvedCount = await this.reviews.countApprovedForShop(
      input.shopId,
    );

    if (approvedCount >= limit) {
      const message =
        input.shopPlan === "PRO"
          ? `Pro plan allows up to ${PRO_MAX_PUBLISHED_REVIEWS} published reviews.`
          : `Free plan allows up to ${FREE_MAX_PUBLISHED_REVIEWS} published reviews. Upgrade to Pro to approve more reviews.`;

      throw new DomainError(message, "PLAN_LIMIT_REACHED");
    }
  }

  async getPublishedReviewUsage(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<PublishedReviewUsage> {
    const used = await this.reviews.countApprovedForShop(input.shopId);

    return {
      used,
      limit: getPublishedReviewLimit(input.shopPlan),
    };
  }
}

export const billingEntitlementsService: BillingService =
  new BillingEntitlementsService(reviewRepository);

