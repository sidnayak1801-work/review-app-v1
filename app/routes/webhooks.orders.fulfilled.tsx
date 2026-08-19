import type { ActionFunctionArgs } from "react-router";

import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { shopService } from "../features/shops/shop.service.server";
import {
  authenticateShopifyWebhook,
  webhookMethodNotAllowedResponse,
} from "../lib/shopify-webhook.server";
import { logger } from "../services/logger.server";
import { authenticate } from "../shopify.server";

export const loader = () => webhookMethodNotAllowedResponse();

export const action = async ({ request }: ActionFunctionArgs) => {
  const result = await authenticateShopifyWebhook(
    authenticate.webhook,
    request,
  );
  if (!result.ok) {
    return result.response;
  }

  const { shop, payload } = result.data;
  const shopRecord = await shopService.findByDomain(shop);

  if (!shopRecord || shopRecord.status !== "INSTALLED") {
    logger.warn("Ignoring order fulfilled webhook for unknown or uninstalled shop", {
      shop,
    });
    return new Response();
  }

  const parsedPayload = reviewRequestService.parseOrderFulfilledPayload(payload);

  await reviewRequestService.scheduleFromFulfilledOrder({
    shopId: shopRecord.id,
    shopPlan: shopRecord.plan,
    payload: parsedPayload,
  });

  await reviewRequestService.processDueRequests({
    shopId: shopRecord.id,
    shopPlan: shopRecord.plan,
  });

  return new Response();
};
