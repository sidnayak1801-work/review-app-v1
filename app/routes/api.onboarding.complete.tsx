import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/** POST /api/onboarding/complete — finish onboarding when theme is enabled. */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  try {
    const status = await onboardingService.complete(shop.id);
    if (!status.completed) {
      return data(
        {
          ok: false as const,
          status,
          message: "Enable storefront reviews before finishing setup.",
        },
        { status: 400 },
      );
    }
    return data({ ok: true as const, status });
  } catch {
    return data(
      { ok: false as const, message: "Unable to complete onboarding." },
      { status: 500 },
    );
  }
}
