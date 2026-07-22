import { randomUUID } from "node:crypto";

import { DomainError } from "../../lib/domain-error";
import { getAppBaseUrl, getEmailProvider } from "../../lib/email-env.server";
import {
  createSubmissionToken,
  hashSubmissionToken,
} from "../../lib/review-request-token.server";
import { parseWithSchema } from "../../lib/validation";
import type { ReviewRepository } from "../../repositories/review.repository.server";
import { reviewRepository } from "../../repositories/review.repository.server";
import type {
  ReviewRequestRecord,
  ReviewRequestRepository,
} from "../../repositories/review-request.repository.server";
import { reviewRequestRepository } from "../../repositories/review-request.repository.server";
import type {
  ReviewRequestSettingsRecord,
  ReviewRequestSettingsRepository,
} from "../../repositories/review-request-settings.repository.server";
import {
  defaultReviewRequestSettings,
  reviewRequestSettingsRepository,
} from "../../repositories/review-request-settings.repository.server";
import type { ShopPlan, ShopRepository } from "../../repositories/shop.repository.server";
import { shopRepository } from "../../repositories/shop.repository.server";
import type { EmailProvider } from "../../services/email-provider.server";
import { EmailProviderError } from "../../services/email-provider.server";
import { logger } from "../../services/logger.server";
import type { BillingService } from "../billing/billing.service.server";
import { billingEntitlementsService } from "../billing/billing.service.server";
import {
  extractProductIdsFromOrder,
  FREE_MAX_PRODUCTS_IN_EMAIL,
  MAX_REVIEW_REQUEST_ATTEMPTS,
  orderFulfilledWebhookSchema,
  resolveCustomerEmail,
  resolveOrderId,
  resolveShippingCountryCode,
  REVIEW_REQUEST_BATCH_SIZE,
  updateReviewRequestSettingsSchema,
  reviewRequestSubmissionSchema,
  type OrderFulfilledWebhookPayload,
  type ReviewRequestSubmissionInput,
} from "./review-request.schema";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolveDelayDays(input: {
  shopPlan: ShopPlan;
  settings: ReviewRequestSettingsRecord;
  shippingCountryCode: string | null;
}): number {
  if (input.shopPlan === "FREE") {
    return input.settings.requestDelayDays;
  }

  const home = input.settings.homeCountryCode.toUpperCase();
  const shipping = input.shippingCountryCode?.toUpperCase() ?? null;

  if (!shipping) {
    return input.settings.domesticDelayDays;
  }

  return shipping === home
    ? input.settings.domesticDelayDays
    : input.settings.internationalDelayDays;
}

export function renderReviewRequestTemplate(input: {
  template: string;
  shopName: string;
  productLinks: Array<{ productId: string; reviewUrl: string }>;
}): string {
  const shopNameSuffix = input.shopName ? ` from ${escapeHtml(input.shopName)}` : "";
  const productList = input.productLinks
    .map((item) => `<li>${escapeHtml(item.productId)}</li>`)
    .join("");
  const reviewLinks = input.productLinks
    .map(
      (item) =>
        `<p><a href="${escapeHtml(item.reviewUrl)}">Leave a review</a> for ${escapeHtml(item.productId)}</p>`,
    )
    .join("\n");

  return input.template
    .replaceAll("{{shop_name}}", escapeHtml(input.shopName))
    .replaceAll("{{shop_name_suffix}}", shopNameSuffix)
    .replaceAll(
      "{{product_list}}",
      productList ? `<ul>${productList}</ul>` : "",
    )
    .replaceAll("{{review_links}}", reviewLinks);
}

function groupByOrder(
  requests: ReviewRequestRecord[],
): Map<string, ReviewRequestRecord[]> {
  const groups = new Map<string, ReviewRequestRecord[]>();

  for (const request of requests) {
    const key = `${request.shopId}::${request.shopifyOrderId}`;
    const existing = groups.get(key) ?? [];
    existing.push(request);
    groups.set(key, existing);
  }

  return groups;
}

export class ReviewRequestService {
  constructor(
    private readonly requests: ReviewRequestRepository,
    private readonly reviews: ReviewRepository,
    private readonly shops: ShopRepository,
    private readonly billing: BillingService,
    private readonly emailProvider: EmailProvider,
    private readonly settings: ReviewRequestSettingsRepository,
  ) {}

  async listRecentForShop(shopId: string): Promise<ReviewRequestRecord[]> {
    return this.requests.listForShop(shopId, 50);
  }

  async getSettingsForShop(
    shopId: string,
  ): Promise<ReviewRequestSettingsRecord> {
    const existing = await this.settings.findByShopId(shopId);
    if (existing) {
      return existing;
    }

    return this.settings.upsert(defaultReviewRequestSettings(shopId));
  }

  async updateSettingsForShop(
    shopId: string,
    shopPlan: ShopPlan,
    rawInput: unknown,
  ): Promise<ReviewRequestSettingsRecord> {
    const data = parseWithSchema(
      updateReviewRequestSettingsSchema,
      rawInput,
      "Invalid review request settings",
    );

    if (shopPlan === "FREE") {
      data.domesticDelayDays = data.requestDelayDays;
      data.internationalDelayDays = data.requestDelayDays;
    }

    return this.settings.upsert({
      shopId,
      ...data,
    });
  }

  async scheduleFromFulfilledOrder(input: {
    shopId: string;
    shopPlan: ShopPlan;
    payload: OrderFulfilledWebhookPayload;
  }): Promise<{ scheduledCount: number; skippedCount: number }> {
    const customerEmail = resolveCustomerEmail(input.payload);

    if (!customerEmail) {
      logger.warn("Skipping review request scheduling without customer email", {
        shopId: input.shopId,
      });
      return { scheduledCount: 0, skippedCount: 0 };
    }

    const settings = await this.getSettingsForShop(input.shopId);
    const shippingCountryCode = resolveShippingCountryCode(input.payload);

    if (!shippingCountryCode && input.shopPlan === "PRO") {
      logger.warn("Missing shipping country; using domestic delay", {
        shopId: input.shopId,
      });
    }

    const delayDays = resolveDelayDays({
      shopPlan: input.shopPlan,
      settings,
      shippingCountryCode,
    });
    const scheduledAt = addDays(new Date(), delayDays);
    const orderId = resolveOrderId(input.payload);
    const productIds = extractProductIdsFromOrder(input.payload);
    let scheduledCount = 0;
    let skippedCount = 0;

    for (const shopifyProductId of productIds) {
      try {
        await this.requests.create({
          shopId: input.shopId,
          shopifyOrderId: orderId,
          shopifyProductId,
          customerEmail,
          scheduledAt,
          submissionTokenHash: hashSubmissionToken(randomUUID()),
        });

        scheduledCount += 1;
      } catch (error) {
        const prismaCode =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (
          prismaCode ||
          (error instanceof Error &&
            error.message.includes("Unique constraint"))
        ) {
          skippedCount += 1;
          continue;
        }

        throw error;
      }
    }

    logger.info("Scheduled review requests from fulfilled order", {
      shopId: input.shopId,
      orderId,
      delayDays,
      scheduledCount,
      skippedCount,
    });

    return { scheduledCount, skippedCount };
  }

  async processDueRequests(input?: {
    shopId?: string;
    shopPlan?: ShopPlan;
  }): Promise<{ sentCount: number; failedCount: number; skippedCount: number }> {
    const dueRequests = await this.requests.findDueForProcessing(
      REVIEW_REQUEST_BATCH_SIZE,
    );
    const filtered = dueRequests.filter(
      (request) => !input?.shopId || request.shopId === input.shopId,
    );
    const groups = groupByOrder(filtered);

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const group of groups.values()) {
      const primary = group[0];
      if (!primary) {
        continue;
      }

      const shop = await this.shops.findById(primary.shopId);

      if (!shop) {
        skippedCount += 1;
        continue;
      }

      if (input?.shopPlan && input.shopId === primary.shopId) {
        // keep plan from caller when provided for the same shop
      }

      try {
        await this.sendOrderGroup({
          requests: group,
          shopPlan: input?.shopPlan && input.shopId === primary.shopId
            ? input.shopPlan
            : shop.plan,
          shopDomain: shop.shopDomain,
        });
        sentCount += 1;
      } catch (error) {
        if (
          error instanceof DomainError &&
          error.code === "REVIEW_REQUEST_LIMIT_REACHED"
        ) {
          await this.requests.updateManyForOrder(
            primary.shopId,
            primary.shopifyOrderId,
            group.map((item) => item.id),
            {
              status: "CANCELLED",
              lastErrorCode: error.code,
            },
          );
          skippedCount += 1;
          continue;
        }

        failedCount += 1;
      }
    }

    const reminderResult = await this.processDueReminders(input);
    return {
      sentCount: sentCount + reminderResult.sentCount,
      failedCount: failedCount + reminderResult.failedCount,
      skippedCount: skippedCount + reminderResult.skippedCount,
    };
  }

  private async processDueReminders(input?: {
    shopId?: string;
    shopPlan?: ShopPlan;
  }): Promise<{ sentCount: number; failedCount: number; skippedCount: number }> {
    const candidates = await this.requests.findDueForReminder(
      REVIEW_REQUEST_BATCH_SIZE,
    );
    const filtered = candidates.filter(
      (request) => !input?.shopId || request.shopId === input.shopId,
    );
    const groups = groupByOrder(filtered);

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const group of groups.values()) {
      const primary = group[0];
      if (!primary?.sentAt) {
        continue;
      }

      if (group.some((item) => item.reminderSentAt)) {
        skippedCount += 1;
        continue;
      }

      const orderRows = await this.requests.findByOrderForShop(
        primary.shopId,
        primary.shopifyOrderId,
      );

      if (orderRows.every((row) => row.status === "COMPLETED")) {
        skippedCount += 1;
        continue;
      }

      const incomplete = orderRows.filter((row) => row.status !== "COMPLETED");
      if (incomplete.length === 0) {
        skippedCount += 1;
        continue;
      }

      const settings = await this.getSettingsForShop(primary.shopId);
      if (!settings.reminderEnabled) {
        skippedCount += 1;
        continue;
      }

      const reminderDueAt = addDays(primary.sentAt, settings.reminderDelayDays);
      if (reminderDueAt > new Date()) {
        continue;
      }

      const shop = await this.shops.findById(primary.shopId);

      if (!shop) {
        skippedCount += 1;
        continue;
      }

      const shopPlan =
        input?.shopPlan && input.shopId === primary.shopId
          ? input.shopPlan
          : shop.plan;

      try {
        await this.billing.assertCanSendReviewRequest({
          shopId: primary.shopId,
          shopPlan,
        });

        const productLinks = [];
        for (const row of incomplete) {
          const { token, tokenHash } = createSubmissionToken();
          await this.requests.updateForShop(row.shopId, row.id, {
            submissionTokenHash: tokenHash,
          });
          productLinks.push({
            productId: row.shopifyProductId,
            reviewUrl: `${getAppBaseUrl()}/api/review-request?token=${encodeURIComponent(token)}`,
          });
        }

        const listed =
          shopPlan === "FREE"
            ? productLinks.slice(0, FREE_MAX_PRODUCTS_IN_EMAIL)
            : productLinks;

        const shopName = shop.shopDomain.replace(/\.myshopify\.com$/i, "");

        await this.emailProvider.sendEmail({
          to: primary.customerEmail,
          subject: settings.reminderSubject,
          html: renderReviewRequestTemplate({
            template: settings.reminderBodyHtml,
            shopName,
            productLinks: listed,
          }),
        });

        const now = new Date();
        await this.requests.updateForShop(primary.shopId, primary.id, {
          reminderSentAt: now,
        });

        sentCount += 1;
      } catch (error) {
        if (
          error instanceof DomainError &&
          error.code === "REVIEW_REQUEST_LIMIT_REACHED"
        ) {
          skippedCount += 1;
          continue;
        }

        failedCount += 1;
        logger.warn("Reminder email failed", {
          shopId: primary.shopId,
          orderId: primary.shopifyOrderId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return { sentCount, failedCount, skippedCount };
  }

  private async sendOrderGroup(input: {
    requests: ReviewRequestRecord[];
    shopPlan: ShopPlan;
    shopDomain: string;
  }): Promise<void> {
    const primary = input.requests[0];
    if (!primary) {
      return;
    }

    const needsAllowance = input.requests.some(
      (request) => request.status === "SCHEDULED",
    );

    if (needsAllowance) {
      await this.billing.assertCanSendReviewRequest({
        shopId: primary.shopId,
        shopPlan: input.shopPlan,
      });
    }

    const settings = await this.getSettingsForShop(primary.shopId);
    const productLinks = [];

    for (const request of input.requests) {
      const { token, tokenHash } = createSubmissionToken();
      await this.requests.updateForShop(request.shopId, request.id, {
        submissionTokenHash: tokenHash,
        attemptCount: request.attemptCount + 1,
      });
      productLinks.push({
        productId: request.shopifyProductId,
        reviewUrl: `${getAppBaseUrl()}/api/review-request?token=${encodeURIComponent(token)}`,
      });
    }

    const listed =
      input.shopPlan === "FREE"
        ? productLinks.slice(0, FREE_MAX_PRODUCTS_IN_EMAIL)
        : productLinks;

    const shopName = input.shopDomain.replace(/\.myshopify\.com$/i, "");

    try {
      await this.emailProvider.sendEmail({
        to: primary.customerEmail,
        subject: settings.emailSubject,
        html: renderReviewRequestTemplate({
          template: settings.emailBodyHtml,
          shopName,
          productLinks: listed,
        }),
      });

      const now = new Date();
      await this.requests.updateManyForOrder(
        primary.shopId,
        primary.shopifyOrderId,
        input.requests.map((request) => request.id),
        {
          status: "SENT",
          sentAt: now,
          lastErrorCode: null,
        },
      );
    } catch (error) {
      const errorCode =
        error instanceof EmailProviderError
          ? error.code
          : error instanceof DomainError
            ? error.code
            : "SEND_FAILED";

      const nextAttempt = Math.max(
        ...input.requests.map((request) => request.attemptCount + 1),
      );
      const hasRetriesLeft = nextAttempt < MAX_REVIEW_REQUEST_ATTEMPTS;

      await this.requests.updateManyForOrder(
        primary.shopId,
        primary.shopifyOrderId,
        input.requests.map((request) => request.id),
        {
          status: "FAILED",
          scheduledAt: hasRetriesLeft
            ? addDays(new Date(), 1)
            : primary.scheduledAt,
          lastErrorCode: errorCode,
        },
      );

      throw error;
    }
  }

  async getSubmissionContext(token: string): Promise<{
    shopifyProductId: string;
    customerEmail: string;
  }> {
    const request = await this.requests.findByTokenHash(
      hashSubmissionToken(token),
    );

    if (!request) {
      throw new DomainError("Review request not found or expired.", "NOT_FOUND");
    }

    return {
      shopifyProductId: request.shopifyProductId,
      customerEmail: request.customerEmail,
    };
  }

  async submitReviewFromToken(input: {
    rawInput: unknown;
  }): Promise<{ reviewId: string }> {
    const parsed = parseWithSchema(
      reviewRequestSubmissionSchema,
      input.rawInput,
      "Invalid review submission",
    );
    const request = await this.requests.findByTokenHash(
      hashSubmissionToken(parsed.token),
    );

    if (!request) {
      throw new DomainError("Review request not found or expired.", "NOT_FOUND");
    }

    const review = await this.reviews.create({
      shopId: request.shopId,
      shopifyProductId: request.shopifyProductId,
      rating: parsed.rating,
      title: parsed.title,
      body: parsed.body,
      authorName: parsed.authorName,
      authorEmail: request.customerEmail,
      status: "PENDING",
      source: "STOREFRONT",
      verifiedPurchase: true,
    });

    await this.requests.updateForShop(request.shopId, request.id, {
      status: "COMPLETED",
    });

    return { reviewId: review.id };
  }

  parseOrderFulfilledPayload(rawPayload: unknown): OrderFulfilledWebhookPayload {
    return parseWithSchema(
      orderFulfilledWebhookSchema,
      rawPayload,
      "Invalid order fulfilled webhook payload",
    );
  }
}

export const reviewRequestService = new ReviewRequestService(
  reviewRequestRepository,
  reviewRepository,
  shopRepository,
  billingEntitlementsService,
  getEmailProvider(),
  reviewRequestSettingsRepository,
);

export type { ReviewRequestSubmissionInput };
