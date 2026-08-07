import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/** POST /api/onboarding/import — mark import checklist item complete. */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  try {
    const status = await onboardingService.markReviewsImported(shop.id);
    return data({ ok: true as const, status });
  } catch {
    return data(
      { ok: false as const, message: "Unable to update import status." },
      { status: 500 },
    );
  }
}
