import { DomainError } from "../../lib/domain-error";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import type { ReviewRequestRepository } from "../../repositories/review-request.repository.server";
import { reviewRepository } from "../../repositories/review.repository.server";
import { reviewRequestRepository } from "../../repositories/review-request.repository.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import {
  FREE_MAX_PUBLISHED_REVIEWS,
  FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
  getPublishedReviewLimit,
  getReviewRequestLimit,
  getUtcMonthWindow,
  PRO_MAX_PUBLISHED_REVIEWS,
  PRO_MAX_REVIEW_REQUESTS_PER_MONTH,
} from "./billing.constants";

export { getPublishedReviewLimit, getReviewRequestLimit, getUtcMonthWindow };

export interface PublishedReviewUsage {
  used: number;
  limit: number | null;
}

export interface ReviewRequestUsage {
  used: number;
  limit: number;
  monthLabel: string;
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
  assertCanSendReviewRequest(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void>;
  getReviewRequestUsage(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<ReviewRequestUsage>;
}

export class BillingEntitlementsService implements BillingService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly reviewRequests: ReviewRequestRepository,
  ) {}

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

  async assertCanSendReviewRequest(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<void> {
    const usage = await this.getReviewRequestUsage(input);

    if (usage.used >= usage.limit) {
      const message =
        input.shopPlan === "PRO"
          ? `Pro plan allows up to ${PRO_MAX_REVIEW_REQUESTS_PER_MONTH} review-request emails per month.`
          : `Free plan allows up to ${FREE_MAX_REVIEW_REQUESTS_PER_MONTH} review-request emails per month. Upgrade to Pro to send more requests.`;

      throw new DomainError(message, "REVIEW_REQUEST_LIMIT_REACHED");
    }
  }

  async getReviewRequestUsage(input: {
    shopId: string;
    shopPlan: ShopPlan;
  }): Promise<ReviewRequestUsage> {
    const { start, end } = getUtcMonthWindow();
    const used = await this.reviewRequests.countSentForShopInUtcMonth(
      input.shopId,
      start,
      end,
    );

    return {
      used,
      limit: getReviewRequestLimit(input.shopPlan),
      monthLabel: start.toISOString().slice(0, 7),
    };
  }
}

export const billingEntitlementsService: BillingService =
  new BillingEntitlementsService(reviewRepository, reviewRequestRepository);
