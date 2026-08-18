import type { ShopPlan } from "../../repositories/shop.repository.server";

export const PRO_PLAN = "Pro";

export const FREE_MAX_PUBLISHED_REVIEWS = 100;

export const FREE_MAX_REVIEW_REQUESTS_PER_MONTH = 100;

export const BILLING_SYNC_MAX_AGE_MS = 60 * 60 * 1000;

export const PRO_TRIAL_DAYS = 14;
export const PRO_MONTHLY_PRICE_USD = 19;

/** `null` means unlimited for the plan. */
export function getPublishedReviewLimit(plan: ShopPlan): number | null {
  if (plan === "PRO") {
    return null;
  }

  return FREE_MAX_PUBLISHED_REVIEWS;
}

/** `null` means unlimited for the plan. */
export function getReviewRequestLimit(plan: ShopPlan): number | null {
  if (plan === "PRO") {
    return null;
  }

  return FREE_MAX_REVIEW_REQUESTS_PER_MONTH;
}

export function getUtcMonthWindow(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
  );

  return { start, end };
}
