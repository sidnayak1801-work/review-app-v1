import { logger } from "../../services/logger.server";
import type { OnboardingAnalyticsEvent } from "./onboarding.types";

/** Thin structured logger; swap for a product analytics sink later. */
export function trackOnboardingEvent(
  event: OnboardingAnalyticsEvent,
  context: { shopId: string; shopDomain?: string },
): void {
  logger.info("onboarding_event", {
    event,
    shopId: context.shopId,
    ...(context.shopDomain ? { shopDomain: context.shopDomain } : {}),
  });
}
