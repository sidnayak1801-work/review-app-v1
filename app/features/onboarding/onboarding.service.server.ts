import {
  onboardingStatusRepository,
  type OnboardingStatusRecord,
  type OnboardingStatusRepository,
  type OnboardingStepFlags,
} from "../../repositories/onboarding-status.repository.server";
import { trackOnboardingEvent } from "./onboarding-analytics.server";
import type { OnboardingPublicStatus } from "./onboarding.types";

function toPublic(record: OnboardingStatusRecord): OnboardingPublicStatus {
  return {
    themeEnabled: record.themeEnabled,
    widgetAdded: record.widgetAdded,
    reviewsImported: record.reviewsImported,
    emailConfigured: record.emailConfigured,
    completed: record.completed,
    skipped: record.skipped,
    currentStep: record.currentStep,
    completedAt: record.completedAt?.toISOString() ?? null,
    needsOnboarding: !record.completed && !record.skipped,
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

  async setCurrentStep(shopId: string, currentStep: number): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, { currentStep });
    if (currentStep === 1) {
      trackOnboardingEvent("Onboarding Started", { shopId });
    }
    return toPublic(record);
  }

  async markThemeEnabled(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      themeEnabled: true,
      currentStep: Math.max(1, 2),
    });
    trackOnboardingEvent("Theme Enabled", { shopId });
    return toPublic(record);
  }

  async markWidgetAdded(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      widgetAdded: true,
      currentStep: Math.max(2, 3),
    });
    trackOnboardingEvent("Widget Added", { shopId });
    return toPublic(record);
  }

  async markReviewsImported(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      reviewsImported: true,
      currentStep: Math.max(3, 4),
    });
    trackOnboardingEvent("Import Completed", { shopId });
    return toPublic(record);
  }

  async markEmailConfigured(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      emailConfigured: true,
      currentStep: Math.max(4, 5),
    });
    trackOnboardingEvent("Email Configured", { shopId });
    return toPublic(record);
  }

  async skipStep(
    shopId: string,
    step: "widget" | "import" | "email",
  ): Promise<OnboardingPublicStatus> {
    const patch: OnboardingStepFlags = {};
    if (step === "widget") {
      patch.currentStep = 3;
      trackOnboardingEvent("Skipped Widget", { shopId });
    } else if (step === "import") {
      patch.currentStep = 4;
      trackOnboardingEvent("Skipped Import", { shopId });
    } else {
      patch.currentStep = 5;
      trackOnboardingEvent("Skipped Emails", { shopId });
    }
    const record = await this.statuses.update(shopId, patch);
    return toPublic(record);
  }

  async skipOnboarding(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      skipped: true,
      completedAt: new Date(),
    });
    trackOnboardingEvent("Skipped Onboarding", { shopId });
    return toPublic(record);
  }

  async complete(shopId: string): Promise<OnboardingPublicStatus> {
    const record = await this.statuses.update(shopId, {
      completed: true,
      skipped: false,
      completedAt: new Date(),
      currentStep: 5,
    });
    trackOnboardingEvent("Onboarding Completed", { shopId });
    return toPublic(record);
  }
}

export const onboardingService = new OnboardingService();
