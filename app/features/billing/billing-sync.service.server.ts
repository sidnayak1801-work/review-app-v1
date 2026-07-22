import {
  shopRepository,
  type ShopPlan,
  type ShopRecord,
  type ShopRepository,
} from "../../repositories/shop.repository.server";
import { logger } from "../../services/logger.server";
import { BILLING_SYNC_MAX_AGE_MS, PRO_PLAN } from "./billing.constants";

export interface ShopifyBillingClient {
  check(input: {
    plans: "Pro"[];
    isTest?: boolean;
  }): Promise<{
    hasActivePayment: boolean;
    appSubscriptions: Array<{ name: string; id: string }>;
  }>;
}
export interface BillingSyncService {
  syncFromShopify(input: {
    shopId: string;
    billing: ShopifyBillingClient;
    isTest?: boolean;
  }): Promise<ShopRecord>;
  resolvePlanForShop(input: {
    shop: ShopRecord;
    billing?: ShopifyBillingClient;
    isTest?: boolean;
    forceSync?: boolean;
  }): Promise<ShopRecord>;
}

function mapSubscriptionToPlan(
  hasActiveProPayment: boolean,
): { plan: ShopPlan; billingStatus: string } {
  if (hasActiveProPayment) {
    return { plan: "PRO", billingStatus: "ACTIVE" };
  }

  return { plan: "FREE", billingStatus: "FREE" };
}

export class ShopifyBillingSyncService implements BillingSyncService {
  constructor(private readonly shops: ShopRepository) {}

  async syncFromShopify(input: {
    shopId: string;
    billing: ShopifyBillingClient;
    isTest?: boolean;
  }): Promise<ShopRecord> {
    const billingCheck = await input.billing.check({
      plans: [PRO_PLAN],
      ...(input.isTest !== undefined ? { isTest: input.isTest } : {}),
    });

    const hasActiveProPayment =
      billingCheck.hasActivePayment &&
      billingCheck.appSubscriptions.some(
        (subscription) => subscription.name === PRO_PLAN,
      );

    const nextState = mapSubscriptionToPlan(hasActiveProPayment);
    const syncedAt = new Date();

    const updated = await this.shops.updateBillingState(input.shopId, {
      plan: nextState.plan,
      billingStatus: nextState.billingStatus,
      billingSyncedAt: syncedAt,
    });

    if (!updated) {
      throw new Error("Shop not found during billing sync");
    }

    logger.info("Shop billing synced", {
      shopId: input.shopId,
      plan: updated.plan,
      billingStatus: updated.billingStatus,
    });

    return updated;
  }

  async resolvePlanForShop(input: {
    shop: ShopRecord;
    billing?: ShopifyBillingClient;
    isTest?: boolean;
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
      return await this.syncFromShopify({
        shopId: input.shop.id,
        billing: input.billing,
        isTest: input.isTest,
      });
    } catch (error) {
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
