import type { ShopPlan } from "../../repositories/shop.repository.server";

export const PRO_PLAN = "Pro";

export const FREE_MAX_PUBLISHED_REVIEWS = 100;
export const PRO_MAX_PUBLISHED_REVIEWS = 5_000;

export const BILLING_SYNC_MAX_AGE_MS = 15 * 60 * 1000;

export const PRO_TRIAL_DAYS = 14;
export const PRO_MONTHLY_PRICE_USD = 19;

export function getPublishedReviewLimit(plan: ShopPlan): number | null {
  if (plan === "PRO") {
    return PRO_MAX_PUBLISHED_REVIEWS;
  }

  return FREE_MAX_PUBLISHED_REVIEWS;
}
