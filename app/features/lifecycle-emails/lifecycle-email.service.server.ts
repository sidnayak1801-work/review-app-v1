import { getEmailProvider } from "../../lib/email-env.server";
import {
  lifecycleEmailRepository,
  type LifecycleEmailRecord,
  type LifecycleEmailRepository,
  type LifecycleEmailType,
} from "../../repositories/lifecycle-email.repository.server";
import {
  onboardingStatusRepository,
  type OnboardingStatusRepository,
} from "../../repositories/onboarding-status.repository.server";
import {
  shopRepository,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import type { EmailProvider } from "../../services/email-provider.server";
import { EmailProviderError } from "../../services/email-provider.server";
import { logger } from "../../services/logger.server";
import {
  lifecycleIdempotencyKey,
  renderLifecycleEmail,
} from "./lifecycle-email.templates.server";

const HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const BATCH_SIZE = 25;
const STALE_PROCESSING_MS = 10 * 60 * 1000;

const REMINDER_TYPES: LifecycleEmailType[] = [
  "ONBOARDING_REMINDER_24H",
  "ONBOARDING_REMINDER_3D",
];

const INSTALL_SEQUENCE_TYPES: LifecycleEmailType[] = [
  "WELCOME",
  "ONBOARDING_REMINDER_24H",
  "ONBOARDING_REMINDER_3D",
];

const RETRY_DELAYS_MS = [
  0,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

function shopDisplayName(shop: ShopRecord): string {
  return shop.shopDomain.replace(/\.myshopify\.com$/, "");
}

function needsOnboarding(status: {
  completed: boolean;
  skipped: boolean;
}): boolean {
  return !status.completed && !status.skipped;
}

export interface ProcessDueJobsResult {
  processedCount: number;
  sentCount: number;
  cancelledCount: number;
  failedCount: number;
  retriedCount: number;
  skippedCount: number;
}

export class LifecycleEmailService {
  constructor(
    private readonly emails: LifecycleEmailRepository = lifecycleEmailRepository,
    private readonly shops: ShopRepository = shopRepository,
    private readonly onboarding: OnboardingStatusRepository = onboardingStatusRepository,
    private readonly emailProvider: EmailProvider = getEmailProvider(),
  ) {}

  async scheduleForInstall(shop: ShopRecord): Promise<void> {
    const onboarding = await this.onboarding.ensureForShop(shop.id);

    if (!needsOnboarding(onboarding)) {
      logger.info("lifecycle_email.install_skipped_completed", {
        shopId: shop.id,
        shopDomain: shop.shopDomain,
        completed: onboarding.completed,
        skipped: onboarding.skipped,
      });
      return;
    }

    const base = shop.latestInstalledAt;
    const schedules: Array<{ type: LifecycleEmailType; scheduledFor: Date }> = [
      { type: "WELCOME", scheduledFor: new Date() },
      {
        type: "ONBOARDING_REMINDER_24H",
        scheduledFor: new Date(base.getTime() + 24 * HOUR_MS),
      },
      {
        type: "ONBOARDING_REMINDER_3D",
        scheduledFor: new Date(base.getTime() + 72 * HOUR_MS),
      },
    ];

    for (const item of schedules) {
      const existing = await this.emails.findByShopAndType(shop.id, item.type);
      if (existing?.status === "SENT") {
        continue;
      }

      await this.emails.upsertScheduled({
        shopId: shop.id,
        type: item.type,
        scheduledFor: item.scheduledFor,
        status: "SCHEDULED",
      });
    }

    logger.info("lifecycle_email.install_scheduled", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      types: INSTALL_SEQUENCE_TYPES,
    });
  }

  async cancelPendingForShop(shopId: string): Promise<number> {
    const count = await this.emails.cancelPendingForShop(shopId);
    logger.info("lifecycle_email.cancelled_for_shop", { shopId, count });
    return count;
  }

  async cancelPendingReminders(shopId: string): Promise<number> {
    const count = await this.emails.cancelPendingForShop(shopId, REMINDER_TYPES);
    logger.info("lifecycle_email.reminders_cancelled", { shopId, count });
    return count;
  }

  async scheduleCompletionEmail(shopId: string): Promise<LifecycleEmailRecord> {
    await this.cancelPendingReminders(shopId);

    const job = await this.emails.upsertScheduled({
      shopId,
      type: "ONBOARDING_COMPLETED",
      scheduledFor: new Date(),
      status: "SCHEDULED",
    });

    logger.info("lifecycle_email.completion_scheduled", {
      shopId,
      jobId: job.id,
      status: job.status,
    });

    return job;
  }

  async processDueJobs(limit: number = BATCH_SIZE): Promise<ProcessDueJobsResult> {
    const recovered = await this.emails.recoverStaleProcessing(
      new Date(Date.now() - STALE_PROCESSING_MS),
    );
    if (recovered > 0) {
      logger.warn("lifecycle_email.recovered_stale_processing", { recovered });
    }

    const due = await this.emails.findDueScheduled(limit);
    const result: ProcessDueJobsResult = {
      processedCount: 0,
      sentCount: 0,
      cancelledCount: 0,
      failedCount: 0,
      retriedCount: 0,
      skippedCount: 0,
    };

    for (const candidate of due) {
      const claimed = await this.emails.claimForProcessing(candidate.id);
      if (!claimed) {
        result.skippedCount += 1;
        continue;
      }

      result.processedCount += 1;
      const outcome = await this.processClaimedJob(claimed);

      if (outcome === "sent") result.sentCount += 1;
      else if (outcome === "cancelled") result.cancelledCount += 1;
      else if (outcome === "failed") result.failedCount += 1;
      else if (outcome === "retried") result.retriedCount += 1;
      else result.skippedCount += 1;
    }

    if (result.processedCount > 0) {
      logger.info("lifecycle_email.batch_processed", { ...result });
    }

    return result;
  }

  private async processClaimedJob(
    job: LifecycleEmailRecord,
  ): Promise<"sent" | "cancelled" | "failed" | "retried" | "skipped"> {
    const shop = await this.shops.findById(job.shopId);

    if (!shop || shop.status === "UNINSTALLED" || shop.uninstalledAt) {
      await this.emails.markCancelled(job.id);
      logger.info("lifecycle_email.cancelled_uninstalled", {
        jobId: job.id,
        shopId: job.shopId,
        type: job.type,
      });
      return "cancelled";
    }

    if (
      job.type === "ONBOARDING_REMINDER_24H" ||
      job.type === "ONBOARDING_REMINDER_3D"
    ) {
      const onboarding = await this.onboarding.ensureForShop(shop.id);
      if (!needsOnboarding(onboarding)) {
        await this.emails.markCancelled(job.id);
        logger.info("lifecycle_email.cancelled_onboarding_done", {
          jobId: job.id,
          shopId: shop.id,
          type: job.type,
        });
        return "cancelled";
      }
    }

    const to = shop.contactEmail?.trim() ?? "";
    if (!to) {
      return this.handleSendFailure(job, "MISSING_EMAIL");
    }

    try {
      const rendered = renderLifecycleEmail(job.type, {
        shopDomain: shop.shopDomain,
        shopName: shopDisplayName(shop),
      });

      const sendResult = await this.emailProvider.sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        idempotencyKey: lifecycleIdempotencyKey(job.type, shop.id),
      });

      await this.emails.markSent(job.id, {
        sentAt: new Date(),
        providerMessageId: sendResult.providerMessageId ?? null,
      });

      logger.info("lifecycle_email.sent", {
        jobId: job.id,
        shopId: shop.id,
        type: job.type,
        providerMessageId: sendResult.providerMessageId ?? null,
      });

      return "sent";
    } catch (error) {
      const code =
        error instanceof EmailProviderError
          ? error.code
          : error instanceof Error
            ? error.name
            : "SEND_FAILED";

      logger.warn("lifecycle_email.send_failed", {
        jobId: job.id,
        shopId: shop.id,
        type: job.type,
        errorCode: code,
      });

      return this.handleSendFailure(job, code);
    }
  }

  private async handleSendFailure(
    job: LifecycleEmailRecord,
    errorCode: string,
  ): Promise<"failed" | "retried"> {
    const nextAttempt = job.attemptCount + 1;

    if (nextAttempt >= MAX_ATTEMPTS) {
      await this.emails.markFailed(job.id, {
        failedAt: new Date(),
        attemptCount: nextAttempt,
        lastErrorCode: errorCode,
      });
      logger.warn("lifecycle_email.permanently_failed", {
        jobId: job.id,
        shopId: job.shopId,
        type: job.type,
        attemptCount: nextAttempt,
        errorCode,
      });
      return "failed";
    }

    const delayIndex = Math.min(nextAttempt, RETRY_DELAYS_MS.length - 1);
    const delayMs = RETRY_DELAYS_MS[delayIndex] ?? 2 * 60 * 60 * 1000;
    const scheduledFor = new Date(Date.now() + delayMs);

    await this.emails.markRetry(job.id, {
      scheduledFor,
      attemptCount: nextAttempt,
      lastErrorCode: errorCode,
    });

    logger.info("lifecycle_email.retry_scheduled", {
      jobId: job.id,
      shopId: job.shopId,
      type: job.type,
      attemptCount: nextAttempt,
      scheduledFor: scheduledFor.toISOString(),
      errorCode,
    });

    return "retried";
  }
}

export const lifecycleEmailService = new LifecycleEmailService();
