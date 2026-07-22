import type { ActionFunctionArgs } from "react-router";

import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { shopService } from "../features/shops/shop.service.server";
import { logger } from "../services/logger.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
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
