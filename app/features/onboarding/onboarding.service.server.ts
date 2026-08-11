import {
  onboardingStatusRepository,
  type OnboardingStatusRecord,
  type OnboardingStatusRepository,
} from "../../repositories/onboarding-status.repository.server";
import { lifecycleEmailService } from "../lifecycle-emails/lifecycle-email.service.server";
import { trackOnboardingEvent } from "./onboarding-analytics.server";
import type { OnboardingPublicStatus } from "./onboarding.types";

function progressFrom(record: OnboardingStatusRecord): number {
  let done = 0;
  if (record.themeEnabled) done += 1;
  if (record.automationConfigured) done += 1;
  if (record.reviewsImported) done += 1;
  if (record.brandingConfigured) done += 1;
  return done * 25;
}

function toPublic(record: OnboardingStatusRecord): OnboardingPublicStatus {
  return {
    themeEnabled: record.themeEnabled,
    reviewsImported: record.reviewsImported,
    automationConfigured: record.automationConfigured,
    brandingConfigured: record.brandingConfigured,
    completed: record.completed,
    skipped: record.skipped,
    completedAt: record.completedAt?.toISOString() ?? null,
    needsOnboarding: !record.completed && !record.skipped,
    progress: progressFrom(record),
  };
}

export class OnboardingService {
  constructor(
    private readonly statuses: OnboardingStatusRepository = onboardingStatusRepository,
  ) {}

  async ensureForShop(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.ensureForShop(shopId);
    return toPublic(record);
  }

  async getStatus(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.ensureForShop(shopId);
    return toPublic(record);
  }

  async markStarted(shopId: string): Promise<OnboardingPublicStatus> {
    const current = await this.statuses.ensureForShop(shopId);
    const record = current.startedAt
      ? current
      : await this.statuses.update(shopId, { startedAt: new Date() });
    trackOnboardingEvent("Onboarding Started", { shopId });
    trackOnboardingEvent("Welcome Completed", { shopId });
    return toPublic(record);
  }

  async markThemeEnabled(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, { themeEnabled: true });
    trackOnboardingEvent("Theme Enabled", { shopId });
    return toPublic(record);
  }

  async markReviewsImported(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      reviewsImported: true,
    });
    trackOnboardingEvent("Import Completed", { shopId });
    return toPublic(record);
  }

  async markAutomationConfigured(
    shopId: string,
  ): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      automationConfigured: true,
    });
    trackOnboardingEvent("Automation Enabled", { shopId });
    return toPublic(record);
  }

  async markBrandingConfigured(
    shopId: string,
  ): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      brandingConfigured: true,
    });
    trackOnboardingEvent("Branding Customized", { shopId });
    return toPublic(record);
  }

  async skipOptional(
    shopId: string,
    task: "import" | "automation" | "branding",
  ): Promise<OnboardingPublicStatus> {
    if (task === "import") {
      trackOnboardingEvent("Skipped Import", { shopId });
    } else if (task === "automation") {
      trackOnboardingEvent("Skipped Automation", { shopId });
    } else {
      trackOnboardingEvent("Skipped Branding", { shopId });
    }
    return this.getStatus(shopId);
  }

  async skipOnboarding(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      skipped: true,
      completedAt: new Date(),
    });
    await lifecycleEmailService.cancelPendingReminders(shopId);
    trackOnboardingEvent("Skipped Onboarding", { shopId });
    return toPublic(record);
  }

  async complete(shopId: string): Promise<OnboardingPublicStatus> {
    const current = await this.statuses.ensureForShop(shopId);
    if (!current.themeEnabled) {
      return toPublic(current);
    }

    const alreadyCompleted = current.completed;
    const record = alreadyCompleted
      ? current
      : await this.statuses.update(shopId, {
          completed: true,
          skipped: false,
          completedAt: new Date(),
        });

    await lifecycleEmailService.scheduleCompletionEmail(shopId);

    if (!alreadyCompleted) {
      trackOnboardingEvent("Checklist Completed", { shopId });
      trackOnboardingEvent("Onboarding Finished", { shopId });
    }

    return toPublic(record);
  }
}

export const onboardingService = new OnboardingService();
