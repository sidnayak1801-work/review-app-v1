import type { ActionFunctionArgs } from "react-router";

import { sessionService } from "../services/session.service.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);
  await sessionService.removeShopSessions(shop);

  return new Response();
};
