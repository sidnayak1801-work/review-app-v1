import type { ActionFunctionArgs } from "react-router";

import { shopService } from "../features/shops/shop.service.server";
import { sessionService } from "../services/session.service.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);

  await shopService.uninstall(shop);
  await sessionService.removeShopSessions(shop);

  return new Response();
};
