import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  QuestionRecord,
  QuestionRepository,
} from "../../repositories/question.repository.server";
import type {
  ReviewRecord,
  ReviewRepository,
} from "../../repositories/review.repository.server";
import type {
  ReviewRequestRecord,
  ReviewRequestRepository,
} from "../../repositories/review-request.repository.server";
import type {
  ShopRecord,
  ShopRepository,
} from "../../repositories/shop.repository.server";
import { PrivacyService } from "./privacy.service.server";

vi.mock("../../services/session.service.server", () => ({
  sessionService: {
    removeShopSessions: vi.fn().mockResolvedValue(undefined),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const shopRecord: ShopRecord = {
  id: "shop-1",
  shopDomain: "example.myshopify.com",
  shopifyShopId: "gid://shopify/Shop/1",
  plan: "FREE",
  status: "INSTALLED",
  installedAt: new Date("2026-07-17T00:00:00.000Z"),
  uninstalledAt: null,
  billingStatus: null,
  billingSyncedAt: null,
};

const reviewRecord: ReviewRecord = {
  id: "review-1",
  shopId: shopRecord.id,
  shopifyProductId: "gid://shopify/Product/1",
  productTitle: null,
  shopifyCustomerId: "191167",
  rating: 5,
  title: "Great",
  body: "Loved it",
  authorName: "John",
  authorEmail: "john@example.com",
  status: "APPROVED",
  source: "STOREFRONT",
  verifiedPurchase: true,
  featured: false,
  hasImage: false,
  hasVideo: false,
  merchantReply: null,
  merchantReplyAt: null,
  publishedAt: new Date("2026-07-18T00:00:00.000Z"),
  createdAt: new Date("2026-07-18T00:00:00.000Z"),
  updatedAt: new Date("2026-07-18T00:00:00.000Z"),
};

const requestRecord: ReviewRequestRecord = {
  id: "req-1",
  shopId: shopRecord.id,
  shopifyOrderId: "gid://shopify/Order/1",
  shopifyProductId: "gid://shopify/Product/1",
  customerEmail: "john@example.com",
  status: "SENT",
  scheduledAt: new Date("2026-07-18T00:00:00.000Z"),
  sentAt: new Date("2026-07-19T00:00:00.000Z"),
  reminderSentAt: null,
  attemptCount: 1,
  lastErrorCode: null,
  submissionTokenHash: "hash",
  createdAt: new Date("2026-07-18T00:00:00.000Z"),
  updatedAt: new Date("2026-07-19T00:00:00.000Z"),
};

const questionRecord: QuestionRecord = {
  id: "q-1",
  shopId: shopRecord.id,
  shopifyProductId: "gid://shopify/Product/1",
  productTitle: null,
  customerName: "John",
  email: "john@example.com",
  question: "Is this waterproof?",
  answer: null,
  status: "PENDING",
  answeredAt: null,
  publishedAt: null,
  createdAt: new Date("2026-07-18T00:00:00.000Z"),
  updatedAt: new Date("2026-07-18T00:00:00.000Z"),
};

function createShops(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn().mockResolvedValue(shopRecord),
    findByDomain: vi.fn().mockResolvedValue(shopRecord),
    create: vi.fn(),
    install: vi.fn(),
    markUninstalled: vi.fn(),
    deleteByDomain: vi.fn().mockResolvedValue(shopRecord),
    updateBillingState: vi.fn(),
    ...overrides,
  };
}

function createReviews(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn(),
    findByIdForShop: vi.fn(),
    findByIdsForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([reviewRecord]),
    list: vi.fn(),
    listForStorefront: vi.fn(),
    refreshMediaFlags: vi.fn(),
    listProductsForShop: vi.fn(),
    getProductStatsForShop: vi.fn(),
    getProductReviewTrendForShop: vi.fn(),
    getProductRatingTrendForShop: vi.fn(),
    countApprovedForShop: vi.fn(),
    countByStatusForShop: vi.fn(),
    averageApprovedRatingForShop: vi.fn(),
    getApprovedSummaryForShop: vi.fn(),
    getShopReviewVolumeSeries: vi.fn().mockResolvedValue([]),
    updateForShop: vi.fn(),
    setProductTitlesForShop: vi.fn(),
    redactCustomerPii: vi.fn().mockResolvedValue(1),
    deleteForShop: vi.fn(),
    ...overrides,
  };
}

function createRequests(
  overrides: Partial<ReviewRequestRepository> = {},
): ReviewRequestRepository {
  return {
    create: vi.fn(),
    findByIdForShop: vi.fn(),
    findByTokenHash: vi.fn(),
    findDueForProcessing: vi.fn(),
    findDueForReminder: vi.fn(),
    findByOrderForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([requestRecord]),
    listForShop: vi.fn(),
    countSentForShopInUtcMonth: vi.fn(),
    updateForShop: vi.fn(),
    updateManyForOrder: vi.fn(),
    redactCustomerPii: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function createQuestions(
  overrides: Partial<QuestionRepository> = {},
): QuestionRepository {
  return {
    create: vi.fn(),
    findByIdForShop: vi.fn(),
    list: vi.fn(),
    countByStatusForShop: vi.fn(),
    updateForShop: vi.fn(),
    deleteForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([questionRecord]),
    redactCustomerPii: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

describe("PrivacyService", () => {
  it("exports matching customer data for data_request", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const shops = createShops();
    const reviews = createReviews();
    const requests = createRequests();
    const questions = createQuestions();
    const service = new PrivacyService(shops, reviews, requests, questions);

    await service.handleCustomersDataRequest(shopRecord.shopDomain, {
      customer: { id: 191167, email: "John@example.com" },
      orders_requested: [1],
      data_request: { id: 99 },
    });

    expect(reviews.findForCustomerPrivacy).toHaveBeenCalledWith(shopRecord.id, {
      email: "john@example.com",
      customerIds: ["191167", "gid://shopify/Customer/191167"],
    });
    expect(requests.findForCustomerPrivacy).toHaveBeenCalledWith(
      shopRecord.id,
      { email: "john@example.com" },
    );
    expect(questions.findForCustomerPrivacy).toHaveBeenCalledWith(
      shopRecord.id,
      { email: "john@example.com" },
    );
  });

  it("redacts customer PII for customers/redact", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const shops = createShops();
    const reviews = createReviews();
    const requests = createRequests();
    const questions = createQuestions();
    const service = new PrivacyService(shops, reviews, requests, questions);

    await service.handleCustomersRedact(shopRecord.shopDomain, {
      customer: { id: 191167, email: "john@example.com" },
      orders_to_redact: [1],
    });

    expect(reviews.redactCustomerPii).toHaveBeenCalled();
    expect(requests.redactCustomerPii).toHaveBeenCalled();
    expect(questions.redactCustomerPii).toHaveBeenCalled();
  });

  it("deletes shop data for shop/redact", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const shops = createShops();
    const apiTokens = {
      create: vi.fn(),
      listForShop: vi.fn(),
      countActiveForShop: vi.fn(),
      findActiveByHash: vi.fn(),
      findByIdForShop: vi.fn(),
      revokeForShop: vi.fn(),
      touchLastUsed: vi.fn(),
      deleteAllForShop: vi.fn().mockResolvedValue(2),
    };
    const service = new PrivacyService(
      shops,
      createReviews(),
      createRequests(),
      createQuestions(),
      apiTokens,
    );

    const deleted = await service.handleShopRedact(shopRecord.shopDomain, {
      shop_id: 954889,
      shop_domain: shopRecord.shopDomain,
    });

    expect(apiTokens.deleteAllForShop).toHaveBeenCalledWith(shopRecord.id);
    expect(shops.deleteByDomain).toHaveBeenCalledWith(shopRecord.shopDomain);
    expect(deleted).toEqual(shopRecord);
  });

  it("ignores privacy webhooks for unknown shops", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const shops = createShops({
      findByDomain: vi.fn().mockResolvedValue(null),
    });
    const reviews = createReviews();
    const requests = createRequests();
    const questions = createQuestions();
    const service = new PrivacyService(shops, reviews, requests, questions);

    await service.handleCustomersDataRequest("missing.myshopify.com", {
      customer: { email: "a@b.com" },
    });

    expect(reviews.findForCustomerPrivacy).not.toHaveBeenCalled();
    expect(requests.findForCustomerPrivacy).not.toHaveBeenCalled();
  });
});
