import { SessionNotFoundError } from "@shopify/shopify-app-react-router/server";
import type { ActionFunctionArgs } from "react-router";

import { billingSyncService } from "../features/billing/billing-sync.service.server";
import { shopService } from "../features/shops/shop.service.server";
import {
  authenticateShopifyWebhook,
  webhookMethodNotAllowedResponse,
} from "../lib/shopify-webhook.server";
import { logger } from "../services/logger.server";
import { createBillingClient } from "../services/shopify-billing.server";
import { authenticate, unauthenticated } from "../shopify.server";

export const loader = () => webhookMethodNotAllowedResponse();

interface AppSubscriptionPayload {
  app_subscription?: {
    name?: unknown;
    status?: unknown;
  };
}

/** Logged for traceability only; the plan is resolved from Shopify, not here. */
function describeTrigger(payload: unknown): {
  name?: string;
  status?: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const subscription = (payload as AppSubscriptionPayload).app_subscription;

  return {
    ...(typeof subscription?.name === "string"
      ? { name: subscription.name }
      : {}),
    ...(typeof subscription?.status === "string"
      ? { status: subscription.status }
      : {}),
  };
}

/**
 * Keeps the cached plan correct when the merchant never returns to the app
 * after approving, declines the charge, or cancels from Shopify Admin.
 *
 * The payload is treated as a trigger, not as truth. Shopify does not guarantee
 * webhook ordering and retries can reorder deliveries, so writing the delivered
 * status directly would let a late `PENDING` or a stale `DECLINED` downgrade a
 * merchant who has already been approved. Instead the handler re-reads the
 * active subscriptions from Shopify and writes that verified state.
 *
 * Idempotent: redelivery re-runs the same verified read and converges on the
 * same plan.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const result = await authenticateShopifyWebhook(
    authenticate.webhook,
    request,
  );
  if (!result.ok) {
    return result.response;
  }

  const { shop, payload } = result.data;
  const trigger = describeTrigger(payload);
  const shopRecord = await shopService.findByDomain(shop);

  if (!shopRecord || shopRecord.status !== "INSTALLED") {
    logger.warn(
      "Ignoring subscription webhook for unknown or uninstalled shop",
      { shop },
    );
    return new Response();
  }

  try {
    const { admin } = await unauthenticated.admin(shop);

    const { shop: updated } = await billingSyncService.syncFromShopify({
      shopId: shopRecord.id,
      billing: createBillingClient(admin),
    });

    logger.info("Verified plan after subscription webhook", {
      shopId: updated.id,
      plan: updated.plan,
      triggerStatus: trigger.status ?? "unknown",
    });
  } catch (error) {
    // The offline session is gone (typically an uninstall racing this
    // delivery). Retrying cannot succeed, so acknowledge instead of letting
    // Shopify retry until the webhook is disabled.
    if (error instanceof SessionNotFoundError) {
      logger.warn("No offline session for subscription webhook", { shop });
      return new Response();
    }

    // Anything else is potentially transient. Rethrow so the response is a 500
    // and Shopify retries rather than leaving the plan unverified.
    logger.error("Failed to verify plan after subscription webhook", {
      shop,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  return new Response();
};
