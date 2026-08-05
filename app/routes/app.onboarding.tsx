import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect } from "react";

import {
  PRO_MONTHLY_PRICE_USD,
  PRO_TRIAL_DAYS,
} from "../features/billing/billing.constants";
import { OnboardingPage } from "../features/onboarding/components/onboarding-page";
import {
  detectThemeExtensionEnabled,
  detectWidgetBlocksPresent,
} from "../features/onboarding/onboarding-theme-detect.server";
import {
  storefrontUrl,
  themeAddBlockEditorUrl,
  themeAppEmbedEditorUrl,
} from "../features/onboarding/onboarding-theme.server";
import { ONBOARDING_WIDGET_OPTIONS } from "../features/onboarding/onboarding-widgets";
import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { trackOnboardingEvent } from "../features/onboarding/onboarding-analytics.server";
import { reviewImportService } from "../features/review-imports/review-import.service.server";
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const status = await onboardingService.getStatus(shop.id);

  if (!status.needsOnboarding) {
    throw redirect("/app");
  }

  const settings = await reviewRequestService.getSettingsForShop(shop.id);
  const widgetEditorUrls: Record<string, string> = {};
  for (const option of ONBOARDING_WIDGET_OPTIONS) {
    widgetEditorUrls[option.id] = themeAddBlockEditorUrl(
      session.shop,
      option.blockHandle,
    );
  }

  return {
    status,
    shopDomain: session.shop,
    shopPlan: shop.plan,
    themeEditorUrl: themeAppEmbedEditorUrl(session.shop),
    storeUrl: storefrontUrl(session.shop),
    widgetEditorUrls,
    settings: {
      requestDelayDays: settings.requestDelayDays,
      reminderEnabled: settings.reminderEnabled,
      reminderDelayDays: settings.reminderDelayDays,
      emailSubject: settings.emailSubject,
    },
    proTrialDays: PRO_TRIAL_DAYS,
    proMonthlyPrice: PRO_MONTHLY_PRICE_USD,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    switch (intent) {
      case "start": {
        const status = await onboardingService.setCurrentStep(shop.id, 1);
        return data({ ok: true as const, status, message: "Setup started." });
      }
      case "skip": {
        await onboardingService.skipOnboarding(shop.id);
        throw redirect("/app");
      }
      case "set-step": {
        const currentStep = Number(form.get("currentStep") ?? 1);
        const status = await onboardingService.setCurrentStep(
          shop.id,
          Number.isFinite(currentStep) ? currentStep : 1,
        );
        return data({ ok: true as const, status });
      }
      case "theme": {
        const status = await onboardingService.markThemeEnabled(shop.id);
        return data({
          ok: true as const,
          status,
          message: "Theme extension marked enabled.",
        });
      }
      case "poll-theme": {
        const detected = await detectThemeExtensionEnabled(admin);
        const status = detected
          ? await onboardingService.markThemeEnabled(shop.id)
          : await onboardingService.getStatus(shop.id);
        return data({
          ok: true as const,
          status,
          message: detected
            ? "Theme extension detected."
            : "Not detected yet. Enable the app embed, then check again.",
        });
      }
      case "widget": {
        const status = await onboardingService.markWidgetAdded(shop.id);
        return data({ ok: true as const, status, message: "Widget marked added." });
      }
      case "poll-widget": {
        const detected = await detectWidgetBlocksPresent(admin);
        const status = detected
          ? await onboardingService.markWidgetAdded(shop.id)
          : await onboardingService.getStatus(shop.id);
        return data({
          ok: true as const,
          status,
          message: detected
            ? "Widget placement detected."
            : "No widget found yet. Add a block, then check again.",
        });
      }
      case "skip-step": {
        const step = String(form.get("step") ?? "");
        if (step !== "widget" && step !== "import" && step !== "email") {
          return data(
            { ok: false as const, message: "Invalid skip step." },
            { status: 400 },
          );
        }
        const status = await onboardingService.skipStep(shop.id, step);
        return data({ ok: true as const, status, message: "Step skipped." });
      }
      case "upload-import": {
        trackOnboardingEvent("Import Started", { shopId: shop.id });
        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return data(
            { ok: false as const, message: "Choose a CSV file to upload." },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const job = await reviewImportService.createAndProcessImport({
          shopId: shop.id,
          shopPlan: shop.plan,
          fileName: file.name || "import.csv",
          contentType: file.type || "text/csv",
          content: buffer,
        });
        const status = await onboardingService.markReviewsImported(shop.id);
        return data({
          ok: true as const,
          status,
          message: `Imported ${job.importedRows} reviews${
            job.failedRows > 0
              ? ` (${job.failedRows} rows skipped — duplicates or errors).`
              : "."
          }`,
        });
      }
      case "save-email": {
        const existing = await reviewRequestService.getSettingsForShop(shop.id);
        const requestDelayDays = Number(form.get("requestDelayDays") ?? 3);
        const reminderEnabled =
          form.get("reminderEnabled") === "true" ||
          form.get("reminderEnabled") === "on";
        const reminderDelayDays = Number(
          form.get("reminderDelayDays") ?? existing.reminderDelayDays,
        );
        const emailSubject = String(
          form.get("emailSubject") ?? existing.emailSubject,
        );

        await reviewRequestService.updateSettingsForShop(shop.id, shop.plan, {
          requestDelayDays,
          domesticDelayDays: requestDelayDays,
          internationalDelayDays: requestDelayDays,
          homeCountryCode: existing.homeCountryCode,
          emailSubject,
          emailBodyHtml: existing.emailBodyHtml,
          reminderEnabled,
          reminderDelayDays,
          reminderSubject: existing.reminderSubject,
          reminderBodyHtml: existing.reminderBodyHtml,
        });

        const status = await onboardingService.markEmailConfigured(shop.id);
        return data({
          ok: true as const,
          status,
          message: "Email configuration saved.",
        });
      }
      case "complete": {
        await onboardingService.complete(shop.id);
        throw redirect("/app");
      }
      default:
        return data(
          { ok: false as const, message: "Unknown action." },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    if (error instanceof ValidationError) {
      return data(
        {
          ok: false as const,
          message: error.message,
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    if (error instanceof DomainError) {
      return data(
        { ok: false as const, message: error.message },
        { status: 400 },
      );
    }
    return data(
      {
        ok: false as const,
        message: "Unable to connect to Shopify. Please try again.",
      },
      { status: 500 },
    );
  }
};

export default function OnboardingRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  useEffect(() => {
    const status = actionData && "status" in actionData ? actionData.status : null;
    if (status && !status.needsOnboarding) {
      navigate("/app", { replace: true });
    }
  }, [actionData, navigate]);

  return (
    <OnboardingPage
      {...loaderData}
      actionData={
        actionData && "ok" in actionData
          ? {
              ok: actionData.ok,
              message: "message" in actionData ? actionData.message : undefined,
              status: "status" in actionData ? actionData.status : undefined,
              issues: "issues" in actionData ? actionData.issues : undefined,
            }
          : undefined
      }
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
