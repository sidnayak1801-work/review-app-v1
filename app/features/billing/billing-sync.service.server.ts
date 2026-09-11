import {
  shopRepository,
  type ShopPlan,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import { logger } from "../../services/logger.server";
import {
  BILLING_ACTIVATION_RETRIES,
  BILLING_ACTIVATION_RETRY_DELAY_MS,
  BILLING_STATUS_ACTIVE,
  BILLING_STATUS_DOWNGRADE_SCHEDULED,
  BILLING_STATUS_FREE,
  BILLING_SYNC_MAX_AGE_MS,
  PRO_PLAN,
} from "./billing.constants";

export type ShopifyAppSubscription = {
  name: string;
  id: string;
  createdAt?: string;
  currentPeriodEnd?: string | null;
  trialDays?: number;
  test?: boolean;
};

export type ProSubscriptionSummary = {
  id: string;
  createdAt: string | null;
  currentPeriodEnd: string | null;
  trialDays: number | null;
  /** Shopify created this as a test charge, so it never bills the merchant. */
  test: boolean;
};

export type BillingPhase = "FREE" | "PRO_ACTIVE" | "PRO_DOWNGRADE_SCHEDULED";

export type BillingPresentation = {
  entitlementPlan: ShopPlan;
  billingPhase: BillingPhase;
  proAccessUntil: Date | null;
};

export type BillingSyncResult = {
  shop: ShopRecord;
  proSubscription: ProSubscriptionSummary | null;
  presentation: BillingPresentation;
};

export interface ShopifyBillingClient {
  check(input: {
    plans: "Pro"[];
  }): Promise<{
    hasActivePayment: boolean;
    appSubscriptions: ShopifyAppSubscription[];
  }>;
}

export interface BillingSyncService {
  syncFromShopify(input: {
    shopId: string;
    billing: ShopifyBillingClient;
    /** Set when returning from charge approval, to absorb activation lag. */
    awaitActivation?: boolean;
  }): Promise<BillingSyncResult>;
  resolvePlanForShop(input: {
    shop: ShopRecord;
    billing?: ShopifyBillingClient;
    forceSync?: boolean;
  }): Promise<ShopRecord>;
}

function toProSubscriptionSummary(
  subscription: ShopifyAppSubscription | undefined,
): ProSubscriptionSummary | null {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    createdAt: subscription.createdAt ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    trialDays:
      typeof subscription.trialDays === "number" ? subscription.trialDays : null,
    test: subscription.test === true,
  };
}

function hasFutureScheduledDowngrade(
  shop: ShopRecord,
  now: Date = new Date(),
): boolean {
  return (
    shop.billingStatus === BILLING_STATUS_DOWNGRADE_SCHEDULED &&
    shop.billingPeriodEnd !== null &&
    shop.billingPeriodEnd.getTime() > now.getTime()
  );
}

export function resolveBillingPresentation(
  shop: ShopRecord,
  now: Date = new Date(),
): BillingPresentation {
  if (shop.plan === "PRO" && hasFutureScheduledDowngrade(shop, now)) {
    return {
      entitlementPlan: "PRO",
      billingPhase: "PRO_DOWNGRADE_SCHEDULED",
      proAccessUntil: shop.billingPeriodEnd,
    };
  }

  if (shop.plan === "PRO") {
    return {
      entitlementPlan: "PRO",
      billingPhase: "PRO_ACTIVE",
      proAccessUntil: shop.billingPeriodEnd,
    };
  }

  return {
    entitlementPlan: "FREE",
    billingPhase: "FREE",
    proAccessUntil: null,
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ShopifyBillingSyncService implements BillingSyncService {
  constructor(
    private readonly shops: ShopRepository,
    private readonly sleep: (milliseconds: number) => Promise<void> = defaultSleep,
  ) {}

  /**
   * Read the active Pro subscription from Shopify.
   *
   * Deliberately no `isTest` filter. Passing `isTest: false` makes the Shopify
   * SDK discard subscriptions flagged `test`, which is every subscription on a
   * development store — including the one a Shopify app reviewer approves. Only
   * Partners can create test charges, so accepting them here cannot be abused
   * by a merchant on a live store.
   */
  private async checkProSubscription(
    billing: ShopifyBillingClient,
    awaitActivation: boolean,
  ): Promise<{ hasActivePayment: boolean; pro?: ShopifyAppSubscription }> {
    const attempts = awaitActivation ? BILLING_ACTIVATION_RETRIES + 1 : 1;

    for (let attempt = 1; ; attempt += 1) {
      const result = await billing.check({ plans: [PRO_PLAN] });
      const pro = result.appSubscriptions.find(
        (subscription) => subscription.name === PRO_PLAN,
      );

      if (pro || attempt >= attempts) {
        return {
          hasActivePayment: result.hasActivePayment,
          ...(pro ? { pro } : {}),
        };
      }

      await this.sleep(BILLING_ACTIVATION_RETRY_DELAY_MS);
    }
  }

  async syncFromShopify(input: {
    shopId: string;
    billing: ShopifyBillingClient;
    awaitActivation?: boolean;
  }): Promise<BillingSyncResult> {
    const existing = await this.shops.findById(input.shopId);
    if (!existing) {
      throw new Error("Shop not found during billing sync");
    }

    const billingCheck = await this.checkProSubscription(
      input.billing,
      input.awaitActivation === true,
    );

    const proSubscriptionRecord = billingCheck.pro;
    const hasActiveProPayment =
      billingCheck.hasActivePayment && Boolean(proSubscriptionRecord);
    const syncedAt = new Date();

    let nextPlan: ShopPlan;
    let nextStatus: string;
    let nextPeriodEnd: Date | null;

    if (hasActiveProPayment) {
      nextPlan = "PRO";
      nextStatus = BILLING_STATUS_ACTIVE;
      nextPeriodEnd = proSubscriptionRecord?.currentPeriodEnd
        ? new Date(proSubscriptionRecord.currentPeriodEnd)
        : null;
    } else if (hasFutureScheduledDowngrade(existing, syncedAt)) {
      // Cancel removes the sub from activeSubscriptions; keep Pro until the
      // paid period end captured when the merchant scheduled the downgrade.
      nextPlan = "PRO";
      nextStatus = BILLING_STATUS_DOWNGRADE_SCHEDULED;
      nextPeriodEnd = existing.billingPeriodEnd;
    } else {
      nextPlan = "FREE";
      nextStatus = BILLING_STATUS_FREE;
      nextPeriodEnd = null;
    }

    const updated = await this.shops.updateBillingState(input.shopId, {
      plan: nextPlan,
      billingStatus: nextStatus,
      billingSyncedAt: syncedAt,
      billingPeriodEnd: nextPeriodEnd,
    });

    if (!updated) {
      throw new Error("Shop not found during billing sync");
    }

    logger.info("Shop billing synced", {
      shopId: input.shopId,
      plan: updated.plan,
      billingStatus: updated.billingStatus,
    });

    return {
      shop: updated,
      proSubscription:
        nextPlan === "PRO" && hasActiveProPayment
          ? toProSubscriptionSummary(proSubscriptionRecord)
          : null,
      presentation: resolveBillingPresentation(updated, syncedAt),
    };
  }

  async resolvePlanForShop(input: {
    shop: ShopRecord;
    billing?: ShopifyBillingClient;
    forceSync?: boolean;
  }): Promise<ShopRecord> {
    if (!input.billing) {
      return input.shop;
    }

    const syncedAt = input.shop.billingSyncedAt?.getTime() ?? 0;
    const isFresh =
      Date.now() - syncedAt < BILLING_SYNC_MAX_AGE_MS && !input.forceSync;

    if (isFresh) {
      return input.shop;
    }

    try {
      const { shop } = await this.syncFromShopify({
        shopId: input.shop.id,
        billing: input.billing,
      });
      return shop;
    } catch (error) {
      // A thrown Response is App Bridge control flow (reauth or bounce), not a
      // sync failure. Swallowing it would silently strand the caller on a stale
      // plan instead of letting the merchant re-authenticate.
      if (error instanceof Response) {
        throw error;
      }

      logger.warn("Billing sync failed; using cached plan", {
        shopId: input.shop.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      return input.shop;
    }
  }
}

export const billingSyncService = new ShopifyBillingSyncService(shopRepository);
