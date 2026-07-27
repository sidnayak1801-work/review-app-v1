import {
  reviewRepository,
  type ReviewRecord,
  type ReviewRepository,
} from "../../repositories/review.repository.server";
import {
  reviewRequestRepository,
  type ReviewRequestRecord,
  type ReviewRequestRepository,
} from "../../repositories/review-request.repository.server";
import {
  questionRepository,
  type QuestionRecord,
  type QuestionRepository,
} from "../../repositories/question.repository.server";
import {
  shopRepository,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import {
  apiTokenRepository,
  type ApiTokenRepository,
} from "../../repositories/api-token.repository.server";
import { sessionService } from "../../services/session.service.server";
import { logger } from "../../services/logger.server";

export interface CustomerPrivacyPayload {
  shop_id?: number;
  shop_domain?: string;
  customer?: {
    id?: number;
    email?: string;
    phone?: string;
  };
  orders_requested?: number[];
  orders_to_redact?: number[];
  data_request?: {
    id?: number;
  };
}

export interface ShopRedactPayload {
  shop_id?: number;
  shop_domain?: string;
}

function normalizeEmail(email: string | undefined): string | null {
  if (!email) {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function customerIdCandidates(customerId: number | undefined): string[] {
  if (customerId === undefined) {
    return [];
  }

  const numeric = String(customerId);
  return [numeric, `gid://shopify/Customer/${numeric}`];
}

function toExportableReview(review: ReviewRecord) {
  return {
    id: review.id,
    shopifyProductId: review.shopifyProductId,
    shopifyCustomerId: review.shopifyCustomerId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorName: review.authorName,
    authorEmail: review.authorEmail,
    status: review.status,
    source: review.source,
    verifiedPurchase: review.verifiedPurchase,
    publishedAt: review.publishedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}

function toExportableReviewRequest(request: ReviewRequestRecord) {
  return {
    id: request.id,
    shopifyOrderId: request.shopifyOrderId,
    shopifyProductId: request.shopifyProductId,
    customerEmail: request.customerEmail,
    status: request.status,
    scheduledAt: request.scheduledAt.toISOString(),
    sentAt: request.sentAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  };
}

function toExportableQuestion(question: QuestionRecord) {
  return {
    id: question.id,
    shopifyProductId: question.shopifyProductId,
    customerName: question.customerName,
    email: question.email,
    question: question.question,
    answer: question.answer,
    status: question.status,
    answeredAt: question.answeredAt?.toISOString() ?? null,
    publishedAt: question.publishedAt?.toISOString() ?? null,
    createdAt: question.createdAt.toISOString(),
  };
}

export class PrivacyService {
  constructor(
    private readonly shops: ShopRepository,
    private readonly reviews: ReviewRepository,
    private readonly reviewRequests: ReviewRequestRepository,
    private readonly questions: QuestionRepository,
    private readonly apiTokens: ApiTokenRepository = apiTokenRepository,
  ) {}

  /**
   * Collects customer-owned records for a Shopify data request.
   * Returns exportable payloads for operator fulfillment; does not log PII.
   */
  async collectCustomerDataExport(
    shopDomain: string,
    payload: CustomerPrivacyPayload,
  ): Promise<{
    shop: ShopRecord | null;
    reviews: ReturnType<typeof toExportableReview>[];
    reviewRequests: ReturnType<typeof toExportableReviewRequest>[];
    questions: ReturnType<typeof toExportableQuestion>[];
  }> {
    const shop = await this.shops.findByDomain(shopDomain);
    if (!shop) {
      return { shop: null, reviews: [], reviewRequests: [], questions: [] };
    }

    const email = normalizeEmail(payload.customer?.email);
    const customerIds = customerIdCandidates(payload.customer?.id);
    const [matchedReviews, matchedRequests, matchedQuestions] =
      await Promise.all([
        this.reviews.findForCustomerPrivacy(shop.id, { email, customerIds }),
        this.reviewRequests.findForCustomerPrivacy(shop.id, { email }),
        this.questions.findForCustomerPrivacy(shop.id, { email }),
      ]);

    return {
      shop,
      reviews: matchedReviews.map(toExportableReview),
      reviewRequests: matchedRequests.map(toExportableReviewRequest),
      questions: matchedQuestions.map(toExportableQuestion),
    };
  }

  async handleCustomersDataRequest(
    shopDomain: string,
    payload: CustomerPrivacyPayload,
  ): Promise<void> {
    const exportResult = await this.collectCustomerDataExport(
      shopDomain,
      payload,
    );

    if (!exportResult.shop) {
      logger.warn("customers/data_request for unknown shop", { shopDomain });
      return;
    }

    logger.info("customers/data_request processed", {
      shopId: exportResult.shop.id,
      shopDomain: exportResult.shop.shopDomain,
      dataRequestId: payload.data_request?.id ?? null,
      ordersRequestedCount: payload.orders_requested?.length ?? 0,
      reviewCount: exportResult.reviews.length,
      reviewRequestCount: exportResult.reviewRequests.length,
      questionCount: exportResult.questions.length,
      reviewIds: exportResult.reviews.map((review) => review.id),
      reviewRequestIds: exportResult.reviewRequests.map((request) => request.id),
      questionIds: exportResult.questions.map((question) => question.id),
    });
  }

  async handleCustomersRedact(
    shopDomain: string,
    payload: CustomerPrivacyPayload,
  ): Promise<void> {
    const shop = await this.shops.findByDomain(shopDomain);
    if (!shop) {
      logger.warn("customers/redact for unknown shop", { shopDomain });
      return;
    }

    const email = normalizeEmail(payload.customer?.email);
    const customerIds = customerIdCandidates(payload.customer?.id);
    const [redactedReviews, redactedRequests, redactedQuestions] =
      await Promise.all([
        this.reviews.redactCustomerPii(shop.id, { email, customerIds }),
        this.reviewRequests.redactCustomerPii(shop.id, { email }),
        this.questions.redactCustomerPii(shop.id, { email }),
      ]);

    logger.info("customers/redact processed", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      ordersToRedactCount: payload.orders_to_redact?.length ?? 0,
      redactedReviews,
      redactedRequests,
      redactedQuestions,
    });
  }

  async handleShopRedact(
    shopDomain: string,
    payload: ShopRedactPayload,
  ): Promise<ShopRecord | null> {
    const shop = await this.shops.findByDomain(shopDomain);
    if (!shop) {
      logger.warn("shop/redact for unknown shop", {
        shopDomain,
        shopifyShopId: payload.shop_id ?? null,
      });
      return null;
    }

    await sessionService.removeShopSessions(shop.shopDomain);
    // ApiToken rows cascade on Shop delete; explicit delete keeps redact auditable.
    const deletedApiTokens = await this.apiTokens.deleteAllForShop(shop.id);
    const deleted = await this.shops.deleteByDomain(shop.shopDomain);

    logger.info("shop/redact processed", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      deletedApiTokens,
      deleted: Boolean(deleted),
    });

    return deleted;
  }
}

export const privacyService = new PrivacyService(
  shopRepository,
  reviewRepository,
  reviewRequestRepository,
  questionRepository,
  apiTokenRepository,
);
