import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/**
 * Authenticated onboarding status + step mutations.
 * GET  /api/onboarding/status
 * POST intents: start | theme | widget | import | email | skip-step | skip | complete | set-step
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
  let step: "widget" | "import" | "email" | undefined;
  let currentStep: number | undefined;

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      intent?: string;
      step?: string;
      currentStep?: number;
    };
    intent = body.intent ?? "";
    if (body.step === "widget" || body.step === "import" || body.step === "email") {
      step = body.step;
    }
    if (typeof body.currentStep === "number") {
      currentStep = body.currentStep;
    }
  } else {
    const form = await request.formData();
    intent = String(form.get("intent") ?? "");
    const rawStep = String(form.get("step") ?? "");
    if (rawStep === "widget" || rawStep === "import" || rawStep === "email") {
      step = rawStep;
    }
    const rawCurrent = form.get("currentStep");
    if (rawCurrent != null && rawCurrent !== "") {
      currentStep = Number(rawCurrent);
    }
  }

  try {
    let status;
    switch (intent) {
      case "start":
        status = await onboardingService.setCurrentStep(shop.id, 1);
        break;
      case "set-step":
        status = await onboardingService.setCurrentStep(
          shop.id,
          Number.isFinite(currentStep) ? (currentStep as number) : 1,
        );
        break;
      case "theme":
        status = await onboardingService.markThemeEnabled(shop.id);
        break;
      case "widget":
        status = await onboardingService.markWidgetAdded(shop.id);
        break;
      case "import":
        status = await onboardingService.markReviewsImported(shop.id);
        break;
      case "email":
        status = await onboardingService.markEmailConfigured(shop.id);
        break;
      case "skip-step":
        if (!step) {
          return data(
            { ok: false as const, message: "Missing step to skip." },
            { status: 400 },
          );
        }
        status = await onboardingService.skipStep(shop.id, step);
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
