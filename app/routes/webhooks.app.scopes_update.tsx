import type { ActionFunctionArgs } from "react-router";

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

  const { payload, session } = result.data;
  const currentScopes = Array.isArray(payload.current)
    ? payload.current.filter(
        (scope): scope is string => typeof scope === "string",
      )
    : [];

  if (session) {
    await sessionService.updateSessionScopes(session.id, currentScopes);
  }

  return new Response();
};
