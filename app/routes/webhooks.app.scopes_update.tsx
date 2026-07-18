import type { ActionFunctionArgs } from "react-router";

import { sessionService } from "../services/session.service.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session } = await authenticate.webhook(request);
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
