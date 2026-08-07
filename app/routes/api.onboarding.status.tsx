import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/**
 * Authenticated onboarding status.
 * GET  /api/onboarding/status
 * POST intents: start | theme | import | automation | branding | skip | complete
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const status = await onboardingService.getStatus(shop.id);
  return data({ ok: true as const, status });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const contentType = request.headers.get("content-type") ?? "";
  let intent = "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { intent?: string };
    intent = body.intent ?? "";
  } else {
    const form = await request.formData();
    intent = String(form.get("intent") ?? "");
  }

  try {
    let status;
    switch (intent) {
      case "start":
        status = await onboardingService.markStarted(shop.id);
        break;
      case "theme":
        status = await onboardingService.markThemeEnabled(shop.id);
        break;
      case "import":
        status = await onboardingService.markReviewsImported(shop.id);
        break;
      case "automation":
        status = await onboardingService.markAutomationConfigured(shop.id);
        break;
      case "branding":
        status = await onboardingService.markBrandingConfigured(shop.id);
        break;
      case "skip":
        status = await onboardingService.skipOnboarding(shop.id);
        break;
      case "complete":
        status = await onboardingService.complete(shop.id);
        break;
      default:
        return data(
          { ok: false as const, message: "Unknown onboarding action." },
          { status: 400 },
        );
    }

    return data({ ok: true as const, status });
  } catch {
    return data(
      {
        ok: false as const,
        message: "Unable to update onboarding. Please try again.",
      },
      { status: 500 },
    );
  }
}
