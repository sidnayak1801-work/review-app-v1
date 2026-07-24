import { afterEach, describe, expect, it, vi } from "vitest";

import { DomainError } from "../../lib/domain-error";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import type {
  ReviewRequestRecord,
  ReviewRequestRepository,
} from "../../repositories/review-request.repository.server";
import type {
  ReviewRequestSettingsRecord,
  ReviewRequestSettingsRepository,
} from "../../repositories/review-request-settings.repository.server";
import { defaultReviewRequestSettings } from "../../repositories/review-request-settings.repository.server";
import type { ShopRepository } from "../../repositories/shop.repository.server";
import type { BillingService } from "../billing/billing.service.server";
import type { EmailProvider } from "../../services/email-provider.server";
import {
  renderReviewRequestTemplate,
  resolveDelayDays,
  ReviewRequestService,
} from "./review-request.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

const baseRequest: ReviewRequestRecord = {
  id: "request-1",
  shopId: "shop-1",
  shopifyOrderId: "gid://shopify/Order/1",
  shopifyProductId: "gid://shopify/Product/1",
  customerEmail: "buyer@example.com",
  status: "SCHEDULED",
  scheduledAt: new Date("2026-07-20T00:00:00.000Z"),
  sentAt: null,
  reminderSentAt: null,
  attemptCount: 0,
  lastErrorCode: null,
  submissionTokenHash: "hash",
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
};

const baseSettings: ReviewRequestSettingsRecord = {
  id: "settings-1",
  ...defaultReviewRequestSettings("shop-1"),
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
};

function createRequests(
  overrides: Partial<ReviewRequestRepository> = {},
): ReviewRequestRepository {
  return {
    create: vi.fn().mockResolvedValue(baseRequest),
    findByIdForShop: vi.fn(),
    findByTokenHash: vi.fn(),
    findDueForProcessing: vi.fn().mockResolvedValue([]),
    findDueForReminder: vi.fn().mockResolvedValue([]),
    findByOrderForShop: vi.fn().mockResolvedValue([baseRequest]),
    findForCustomerPrivacy: vi.fn().mockResolvedValue([]),
    listForShop: vi.fn().mockResolvedValue([]),
    countSentForShopInUtcMonth: vi.fn().mockResolvedValue(0),
    updateForShop: vi.fn().mockResolvedValue(baseRequest),
    updateManyForOrder: vi.fn().mockResolvedValue(1),
    redactCustomerPii: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createReviews(
  overrides: Partial<ReviewRepository> = {},
): ReviewRepository {
  return {
    create: vi.fn().mockResolvedValue({ id: "review-1" }),
    findByIdForShop: vi.fn(),
    findByIdsForShop: vi.fn(),
    findForCustomerPrivacy: vi.fn(),
    list: vi.fn(),
    listProductsForShop: vi.fn(),
    getProductStatsForShop: vi.fn(),
    getProductReviewTrendForShop: vi.fn(),
    getProductRatingTrendForShop: vi.fn(),
    countApprovedForShop: vi.fn(),
    countByStatusForShop: vi.fn(),
    averageApprovedRatingForShop: vi.fn(),
    updateForShop: vi.fn(),
    setProductTitlesForShop: vi.fn(),
    redactCustomerPii: vi.fn(),
    deleteForShop: vi.fn(),
    ...overrides,
  };
}

function createShops(
  overrides: Partial<ShopRepository> = {},
): ShopRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: "shop-1",
      shopDomain: "demo.myshopify.com",
      shopifyShopId: null,
      plan: "FREE",
      status: "INSTALLED",
      installedAt: new Date(),
      uninstalledAt: null,
      billingStatus: "FREE",
      billingSyncedAt: null,
    }),
    findByDomain: vi.fn(),
    create: vi.fn(),
    install: vi.fn(),
    markUninstalled: vi.fn(),
    deleteByDomain: vi.fn(),
    updateBillingState: vi.fn(),
    ...overrides,
  };
}

function createBilling(
  overrides: Partial<BillingService> = {},
): BillingService {
  return {
    assertCanApprovePublishedReview: vi.fn(),
    getPublishedReviewUsage: vi.fn(),
    assertCanSendReviewRequest: vi.fn().mockResolvedValue(undefined),
    getReviewRequestUsage: vi.fn(),
    ...overrides,
  };
}

function createEmailProvider(
  overrides: Partial<EmailProvider> = {},
): EmailProvider {
  return {
    sendEmail: vi.fn().mockResolvedValue({ providerMessageId: "msg-1" }),
    ...overrides,
  };
}

function createSettings(
  overrides: Partial<ReviewRequestSettingsRepository> = {},
): ReviewRequestSettingsRepository {
  return {
    findByShopId: vi.fn().mockResolvedValue(baseSettings),
    upsert: vi.fn().mockResolvedValue(baseSettings),
    ...overrides,
  };
}

function createService(input?: {
  requests?: ReviewRequestRepository;
  reviews?: ReviewRepository;
  shops?: ShopRepository;
  billing?: BillingService;
  email?: EmailProvider;
  settings?: ReviewRequestSettingsRepository;
}) {
  return new ReviewRequestService(
    input?.requests ?? createRequests(),
    input?.reviews ?? createReviews(),
    input?.shops ?? createShops(),
    input?.billing ?? createBilling(),
    input?.email ?? createEmailProvider(),
    input?.settings ?? createSettings(),
  );
}

describe("resolveDelayDays", () => {
  it("uses Free global delay", () => {
    expect(
      resolveDelayDays({
        shopPlan: "FREE",
        settings: { ...baseSettings, requestDelayDays: 5 },
        shippingCountryCode: "CA",
      }),
    ).toBe(5);
  });

  it("uses Pro domestic vs international delays", () => {
    const settings = {
      ...baseSettings,
      homeCountryCode: "US",
      domesticDelayDays: 2,
      internationalDelayDays: 10,
    };

    expect(
      resolveDelayDays({
        shopPlan: "PRO",
        settings,
        shippingCountryCode: "US",
      }),
    ).toBe(2);
    expect(
      resolveDelayDays({
        shopPlan: "PRO",
        settings,
        shippingCountryCode: "DE",
      }),
    ).toBe(10);
    expect(
      resolveDelayDays({
        shopPlan: "PRO",
        settings,
        shippingCountryCode: null,
      }),
    ).toBe(2);
  });
});

describe("renderReviewRequestTemplate", () => {
  it("replaces placeholders and escapes product ids", () => {
    const html = renderReviewRequestTemplate({
      template: "Hi{{shop_name_suffix}}. {{review_links}}",
      shopName: "demo",
      productLinks: [
        {
          productId: "gid://shopify/Product/1",
          reviewUrl: "https://app.example.com/r?token=abc",
        },
      ],
    });

    expect(html).toContain("from demo");
    expect(html).toContain("https://app.example.com/r?token=abc");
  });
});

describe("ReviewRequestService", () => {
  it("schedules one request per product using configured delay", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const requests = createRequests();
    const settings = createSettings({
      findByShopId: vi.fn().mockResolvedValue({
        ...baseSettings,
        requestDelayDays: 4,
      }),
    });
    const service = createService({ requests, settings });

    const result = await service.scheduleFromFulfilledOrder({
      shopId: "shop-1",
      shopPlan: "FREE",
      payload: {
        id: 1001,
        admin_graphql_api_id: "gid://shopify/Order/1001",
        email: "buyer@example.com",
        shipping_address: { country_code: "US" },
        line_items: [
          { product_id: 1, quantity: 1 },
          { product_id: 2, quantity: 1 },
        ],
      },
    });

    expect(requests.create).toHaveBeenCalledTimes(2);
    expect(requests.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledAt: expect.any(Date),
      }),
    );
    expect(result.scheduledCount).toBe(2);
  });

  it("sends one email per order group and marks all products sent", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    process.env.SHOPIFY_APP_URL = "https://app.example.com";
    const second = {
      ...baseRequest,
      id: "request-2",
      shopifyProductId: "gid://shopify/Product/2",
    };
    const requests = createRequests({
      findDueForProcessing: vi.fn().mockResolvedValue([baseRequest, second]),
    });
    const emailProvider = createEmailProvider();
    const service = createService({ requests, email: emailProvider });

    const result = await service.processDueRequests();

    expect(emailProvider.sendEmail).toHaveBeenCalledTimes(1);
    expect(requests.updateManyForOrder).toHaveBeenCalledWith(
      "shop-1",
      "gid://shopify/Order/1",
      ["request-1", "request-2"],
      expect.objectContaining({ status: "SENT" }),
    );
    expect(result.sentCount).toBe(1);
  });

  it("cancels new sends when the monthly allowance is reached", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const requests = createRequests({
      findDueForProcessing: vi.fn().mockResolvedValue([baseRequest]),
    });
    const billing = createBilling({
      assertCanSendReviewRequest: vi
        .fn()
        .mockRejectedValue(
          new DomainError("Limit reached", "REVIEW_REQUEST_LIMIT_REACHED"),
        ),
    });
    const service = createService({ requests, billing });

    const result = await service.processDueRequests();

    expect(requests.updateManyForOrder).toHaveBeenCalledWith(
      "shop-1",
      "gid://shopify/Order/1",
      ["request-1"],
      expect.objectContaining({ status: "CANCELLED" }),
    );
    expect(result.skippedCount).toBe(1);
  });

  it("creates a pending review when a token submission succeeds", async () => {
    const requests = createRequests({
      findByTokenHash: vi.fn().mockResolvedValue({
        ...baseRequest,
        status: "SENT",
      }),
    });
    const reviews = createReviews();
    const service = createService({ requests, reviews });

    const result = await service.submitReviewFromToken({
      rawInput: {
        token: "abc123",
        rating: 5,
        body: "Great product",
        authorName: "Alex",
      },
    });

    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        status: "PENDING",
        verifiedPurchase: true,
      }),
    );
    expect(result.reviewId).toBe("review-1");
  });
});
