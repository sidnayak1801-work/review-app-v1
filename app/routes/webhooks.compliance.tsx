import type { ActionFunctionArgs } from "react-router";

import {
  privacyService,
  type CustomerPrivacyPayload,
  type ShopRedactPayload,
} from "../features/privacy/privacy.service.server";
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

  const { shop, topic, payload } = result.data;
  const normalizedTopic = topic.toLowerCase();

  switch (normalizedTopic) {
    case "customers/data_request":
      await privacyService.handleCustomersDataRequest(
        shop,
        payload as CustomerPrivacyPayload,
      );
      break;
    case "customers/redact":
      await privacyService.handleCustomersRedact(
        shop,
        payload as CustomerPrivacyPayload,
      );
      break;
    case "shop/redact":
      await privacyService.handleShopRedact(shop, payload as ShopRedactPayload);
      break;
    default:
      logger.warn("Unhandled compliance webhook topic", {
        shop,
        topic,
      });
      break;
  }

  return new Response();
};
