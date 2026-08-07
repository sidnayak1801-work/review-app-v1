import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

import { detectThemeExtensionEnabled } from "../features/onboarding/onboarding-theme-detect.server";
import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/** POST /api/onboarding/theme — detect or mark theme enabled. */
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  try {
    const detected = await detectThemeExtensionEnabled(admin);
    const status = detected
      ? await onboardingService.markThemeEnabled(shop.id)
      : await onboardingService.getStatus(shop.id);
    return data({
      ok: true as const,
      status,
      detected,
    });
  } catch {
    return data(
      {
        ok: false as const,
        message: "Unable to check theme status. Please try again.",
      },
      { status: 500 },
    );
  }
}
