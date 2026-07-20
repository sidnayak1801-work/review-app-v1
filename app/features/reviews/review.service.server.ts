import { NotFoundError, ValidationError } from "../../lib/domain-error";
import { parseWithSchema } from "../../lib/validation";
import {
  reviewRepository,
  type ReviewRecord,
  type ReviewRepository,
  type ListReviewsResult,
} from "../../repositories/review.repository.server";
import { logger } from "../../services/logger.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import type { BillingService } from "../billing/billing.service.server";
import { billingEntitlementsService } from "../billing/billing.service.server";
import {
  createMerchantReviewSchema,
  createStorefrontReviewSchema,
  listReviewsQuerySchema,
  listStorefrontReviewsQuerySchema,
  updateReviewSchema,
} from "./review.schema";

function toPublicReview(review: ReviewRecord) {
  return {
    id: review.id,
    shopifyProductId: review.shopifyProductId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorName: review.authorName,
    status: review.status,
    source: review.source,
    verifiedPurchase: review.verifiedPurchase,
    publishedAt: review.publishedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}

export class ReviewService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly billing: BillingService,
  ) {}

  async listForShop(
    shopId: string,
    query: unknown,
  ): Promise<ListReviewsResult> {
    const filters = parseWithSchema(
      listReviewsQuerySchema,
      query,
      "Invalid review filters",
    );

    return this.reviews.list({
      shopId,
      status: filters.status,
      shopifyProductId: filters.shopifyProductId,
      cursor: filters.cursor,
      limit: filters.limit,
    });
  }

  async getForShop(shopId: string, reviewId: string): Promise<ReviewRecord> {
    const review = await this.reviews.findByIdForShop(shopId, reviewId);

    if (!review) {
      throw new NotFoundError("Review not found");
    }

    return review;
  }

  async createMerchantReview(
    shopId: string,
    shopPlan: ShopPlan,
    input: unknown,
  ): Promise<ReviewRecord> {
    const data = parseWithSchema(
      createMerchantReviewSchema,
      input,
      "Invalid review",
    );

    if (data.status === "APPROVED") {
      await this.billing.assertCanApprovePublishedReview({
        shopId,
        shopPlan,
      });
    }

    const publishedAt = data.status === "APPROVED" ? new Date() : null;

    const review = await this.reviews.create({
      shopId,
      shopifyProductId: data.shopifyProductId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      status: data.status,
      source: "MERCHANT",
      verifiedPurchase: data.verifiedPurchase,
      publishedAt,
    });

    logger.info("Merchant review created", {
      shopId,
      reviewId: review.id,
      status: review.status,
    });

    return review;
  }

  async updateForShop(
    shopId: string,
    shopPlan: ShopPlan,
    reviewId: string,
    input: unknown,
  ): Promise<ReviewRecord> {
    const data = parseWithSchema(
      updateReviewSchema,
      input,
      "Invalid review update",
    );

    const existing = await this.getForShop(shopId, reviewId);
    const nextStatus = data.status ?? existing.status;

    if (nextStatus === "APPROVED" && existing.status !== "APPROVED") {
      await this.billing.assertCanApprovePublishedReview({
        shopId,
        shopPlan,
      });
    }

    const publishedAt =
      nextStatus === "APPROVED"
        ? (existing.publishedAt ?? new Date())
        : null;

    const updated = await this.reviews.updateForShop(shopId, reviewId, {
      ...data,
      publishedAt,
    });

    if (!updated) {
      throw new NotFoundError("Review not found");
    }

    logger.info("Review updated", {
      shopId,
      reviewId,
      status: updated.status,
    });

    return updated;
  }

  async deleteForShop(shopId: string, reviewId: string): Promise<void> {
    const deleted = await this.reviews.deleteForShop(shopId, reviewId);

    if (!deleted) {
      throw new NotFoundError("Review not found");
    }

    logger.info("Review deleted", { shopId, reviewId });
  }

  async listApprovedForStorefront(
    shopId: string,
    query: unknown,
  ): Promise<{
    items: ReturnType<typeof toPublicReview>[];
    pageInfo: ListReviewsResult["pageInfo"];
  }> {
    const filters = parseWithSchema(
      listStorefrontReviewsQuerySchema,
      query,
      "Invalid storefront review query",
    );

    const result = await this.reviews.list({
      shopId,
      shopifyProductId: filters.shopifyProductId,
      status: "APPROVED",
      cursor: filters.cursor,
      limit: filters.limit,
    });

    return {
      items: result.items.map(toPublicReview),
      pageInfo: result.pageInfo,
    };
  }

  async createStorefrontReview(
    shopId: string,
    input: unknown,
  ): Promise<ReturnType<typeof toPublicReview>> {
    const data = parseWithSchema(
      createStorefrontReviewSchema,
      input,
      "Invalid storefront review",
    );

    if (data.website) {
      throw new ValidationError("Invalid review", ["Spam check failed"]);
    }

    const review = await this.reviews.create({
      shopId,
      shopifyProductId: data.shopifyProductId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      status: "PENDING",
      source: "STOREFRONT",
      verifiedPurchase: false,
      publishedAt: null,
    });

    logger.info("Storefront review submitted", {
      shopId,
      reviewId: review.id,
    });

    return toPublicReview(review);
  }
}

export const reviewService = new ReviewService(
  reviewRepository,
  billingEntitlementsService,
);
