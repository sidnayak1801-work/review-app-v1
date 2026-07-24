import { DomainError, NotFoundError, ValidationError } from "../../lib/domain-error";
import { parseWithSchema } from "../../lib/validation";
import {
  reviewRepository,
  type ReviewRecord,
  type ReviewRepository,
  type ReviewStatusCounts,
  type ListReviewsResult,
} from "../../repositories/review.repository.server";
import { logger } from "../../services/logger.server";
import type { ShopPlan } from "../../repositories/shop.repository.server";
import type { BillingService } from "../billing/billing.service.server";
import { billingEntitlementsService } from "../billing/billing.service.server";
import {
  bulkUpdateReviewStatusSchema,
  createMerchantReviewSchema,
  createStorefrontReviewSchema,
  listReviewsQuerySchema,
  listStorefrontReviewsQuerySchema,
  setFeaturedReviewSchema,
  setMerchantReplySchema,
  updateReviewSchema,
} from "./review.schema";
import {
  reviewMediaService,
  toPublicMedia,
  type ReviewMediaService,
} from "./review-media.service.server";

export interface BulkUpdateReviewStatusResult {
  updatedCount: number;
  skippedCount: number;
  failures: Array<{ reviewId: string; reason: string }>;
}

function toPublicReview(
  review: ReviewRecord,
  media: ReturnType<typeof toPublicMedia>[] = [],
) {
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
    featured: review.featured,
    merchantReply: review.merchantReply,
    merchantReplyAt: review.merchantReplyAt?.toISOString() ?? null,
    publishedAt: review.publishedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    media,
  };
}

export class ReviewService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly billing: BillingService,
    private readonly media: ReviewMediaService = reviewMediaService,
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

  async getStatusCountsForShop(shopId: string): Promise<ReviewStatusCounts> {
    return this.reviews.countByStatusForShop(shopId);
  }

  async getAverageApprovedRatingForShop(
    shopId: string,
  ): Promise<number | null> {
    return this.reviews.averageApprovedRatingForShop(shopId);
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

  async bulkUpdateStatusForShop(
    shopId: string,
    shopPlan: ShopPlan,
    input: unknown,
  ): Promise<BulkUpdateReviewStatusResult> {
    const data = parseWithSchema(
      bulkUpdateReviewStatusSchema,
      input,
      "Invalid bulk review update",
    );

    const reviews = await this.reviews.findByIdsForShop(shopId, data.reviewIds);
    const reviewsById = new Map(reviews.map((item) => [item.id, item]));

    const result: BulkUpdateReviewStatusResult = {
      updatedCount: 0,
      skippedCount: 0,
      failures: [],
    };

    let stopApproving = false;

    for (const reviewId of data.reviewIds) {
      const existing = reviewsById.get(reviewId);

      if (!existing) {
        result.failures.push({
          reviewId,
          reason: "Review not found",
        });
        continue;
      }

      if (existing.status === data.status) {
        result.skippedCount += 1;
        continue;
      }

      if (data.status === "APPROVED") {
        if (stopApproving) {
          result.skippedCount += 1;
          continue;
        }

        try {
          await this.billing.assertCanApprovePublishedReview({
            shopId,
            shopPlan,
          });
        } catch (error) {
          const reason =
            error instanceof DomainError
              ? error.message
              : "Could not approve review";

          result.failures.push({ reviewId, reason });
          stopApproving = true;
          continue;
        }
      }

      const publishedAt =
        data.status === "APPROVED"
          ? (existing.publishedAt ?? new Date())
          : null;

      const updated = await this.reviews.updateForShop(shopId, reviewId, {
        status: data.status,
        publishedAt,
      });

      if (!updated) {
        result.failures.push({
          reviewId,
          reason: "Review not found",
        });
        continue;
      }

      result.updatedCount += 1;
      reviewsById.set(reviewId, updated);
    }

    logger.info("Bulk review status update completed", {
      shopId,
      status: data.status,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      failureCount: result.failures.length,
    });

    return result;
  }

  async deleteForShop(shopId: string, reviewId: string): Promise<void> {
    const deleted = await this.reviews.deleteForShop(shopId, reviewId);

    if (!deleted) {
      throw new NotFoundError("Review not found");
    }

    logger.info("Review deleted", { shopId, reviewId });
  }

  async setFeaturedForShop(
    shopId: string,
    input: unknown,
  ): Promise<ReviewRecord> {
    const data = parseWithSchema(
      setFeaturedReviewSchema,
      input,
      "Invalid featured update",
    );

    await this.getForShop(shopId, data.reviewId);

    const updated = await this.reviews.updateForShop(shopId, data.reviewId, {
      featured: data.featured,
    });

    if (!updated) {
      throw new NotFoundError("Review not found");
    }

    logger.info("Review featured flag updated", {
      shopId,
      reviewId: data.reviewId,
      featured: data.featured,
    });

    return updated;
  }

  async setMerchantReplyForShop(
    shopId: string,
    input: unknown,
  ): Promise<ReviewRecord> {
    const data = parseWithSchema(
      setMerchantReplySchema,
      input,
      "Invalid merchant reply",
    );

    await this.getForShop(shopId, data.reviewId);

    const updated = await this.reviews.updateForShop(shopId, data.reviewId, {
      merchantReply: data.merchantReply,
      merchantReplyAt: data.merchantReply ? new Date() : null,
    });

    if (!updated) {
      throw new NotFoundError("Review not found");
    }

    logger.info("Review merchant reply updated", {
      shopId,
      reviewId: data.reviewId,
      hasReply: Boolean(data.merchantReply),
    });

    return updated;
  }

  async listApprovedForStorefront(
    shopId: string,
    query: unknown,
    options: { includeMedia?: boolean } = {},
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

    const grouped =
      options.includeMedia === false
        ? new Map<string, ReturnType<typeof toPublicMedia>[]>()
        : await this.media.listGroupedForReviews(
            shopId,
            result.items.map((item) => item.id),
          );

    return {
      items: result.items
        .map((review) =>
          toPublicReview(review, grouped.get(review.id) ?? []),
        )
        // Featured first within the page (storefront highlight).
        .sort((left, right) => Number(right.featured) - Number(left.featured)),
      pageInfo: result.pageInfo,
    };
  }

  async createStorefrontReview(
    shopId: string,
    shopPlan: ShopPlan,
    input: unknown,
    options: {
      shopifyCustomerId?: string | null;
      autoPublish?: boolean;
    } = {},
  ): Promise<ReturnType<typeof toPublicReview>> {
    // TEMP: guest submissions allowed for publication testing.
    const shopifyCustomerId = options.shopifyCustomerId?.trim() || undefined;

    const data = parseWithSchema(
      createStorefrontReviewSchema,
      input,
      "Invalid storefront review",
    );

    if (data.website) {
      throw new ValidationError("Invalid review", ["Spam check failed"]);
    }

    const mediaRecords = await this.media.resolveForAttach(
      shopId,
      data.mediaIds,
    );

    let status: "PENDING" | "APPROVED" = "PENDING";
    let publishedAt: Date | null = null;

    if (options.autoPublish) {
      try {
        await this.billing.assertCanApprovePublishedReview({
          shopId,
          shopPlan,
        });
        status = "APPROVED";
        publishedAt = new Date();
      } catch (error) {
        if (!(error instanceof DomainError)) {
          throw error;
        }
        logger.info("Auto-publish skipped due to plan limit", {
          shopId,
          code: error.code,
        });
      }
    }

    const review = await this.reviews.create({
      shopId,
      shopifyProductId: data.shopifyProductId,
      shopifyCustomerId,
      rating: data.rating,
      title: data.title,
      productTitle: data.productTitle,
      body: data.body,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      status,
      source: "STOREFRONT",
      verifiedPurchase: false,
      publishedAt,
    });

    if (mediaRecords.length > 0) {
      await this.media.attachToReview(
        shopId,
        review.id,
        mediaRecords.map((item) => item.id),
      );
    }

    logger.info("Storefront review submitted", {
      shopId,
      reviewId: review.id,
      status: review.status,
      shopifyCustomerId: shopifyCustomerId ?? null,
      mediaCount: mediaRecords.length,
    });

    return toPublicReview(
      review,
      mediaRecords.map((item) => toPublicMedia(item)),
    );
  }
}

export const reviewService = new ReviewService(
  reviewRepository,
  billingEntitlementsService,
);
