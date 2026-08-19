import type { ActionFunctionArgs } from "react-router";

import { shopService } from "../features/shops/shop.service.server";
import {
  authenticateShopifyWebhook,
  webhookMethodNotAllowedResponse,
} from "../lib/shopify-webhook.server";
import { sessionService } from "../services/session.service.server";
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

  const { shop } = result.data;

  await shopService.uninstall(shop);
  await sessionService.removeShopSessions(shop);

  return new Response();
};
