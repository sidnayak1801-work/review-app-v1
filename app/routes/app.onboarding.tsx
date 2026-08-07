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

import { OnboardingPage } from "../features/onboarding/components/onboarding-page";
import { detectThemeExtensionEnabled } from "../features/onboarding/onboarding-theme-detect.server";
import {
  storefrontUrl,
  themeAppEmbedEditorUrl,
} from "../features/onboarding/onboarding-theme.server";
import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { trackOnboardingEvent } from "../features/onboarding/onboarding-analytics.server";
import type { OnboardingScreen } from "../features/onboarding/onboarding.types";
import { reviewImportService } from "../features/review-imports/review-import.service.server";
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

const SCREENS: OnboardingScreen[] = [
  "welcome",
  "health",
  "checklist",
  "theme",
  "import",
  "automation",
  "branding",
  "celebration",
];

function parseScreen(raw: string | null): OnboardingScreen {
  if (raw && (SCREENS as string[]).includes(raw)) {
    return raw as OnboardingScreen;
  }
  return "welcome";
}

function screenHref(screen: OnboardingScreen, preservedQuery: string): string {
  const params = new URLSearchParams(preservedQuery);
  params.set("screen", screen);
  return `/app/onboarding?${params.toString()}`;
}

async function detectThemeName(
  admin: { graphql: (query: string) => Promise<Response> },
): Promise<string | null> {
  try {
    const response = await admin.graphql(`#graphql
      query OnboardingMainTheme {
        themes(first: 1, roles: [MAIN]) {
          nodes { name }
        }
      }
    `);
    const payload = (await response.json()) as {
      data?: { themes?: { nodes?: Array<{ name?: string }> } };
    };
    return payload.data?.themes?.nodes?.[0]?.name ?? null;
  } catch {
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const status = await onboardingService.getStatus(shop.id);

  if (!status.needsOnboarding) {
    throw redirect("/app");
  }

  const url = new URL(request.url);
  const screen = parseScreen(url.searchParams.get("screen"));
  const preserved = new URLSearchParams(url.searchParams);
  preserved.delete("screen");
  const preservedQuery = preserved.toString();
  const linkSuffix = preservedQuery ? `&${preservedQuery}` : "";

  const [emailSettings, widgetSettings, themeName] = await Promise.all([
    reviewRequestService.getSettingsForShop(shop.id),
    widgetSettingsService.getForShop(shop.id),
    detectThemeName(admin),
  ]);

  return {
    screen,
    status,
    shopDomain: session.shop,
    health: {
      shopDomain: session.shop,
      planLabel: shop.plan === "PRO" ? "Pro" : "Free",
      themeName,
      scopesOk: true,
    },
    themeEditorUrl: themeAppEmbedEditorUrl(session.shop),
    storeUrl: storefrontUrl(session.shop),
    search: linkSuffix,
    emailSettings: {
      requestDelayDays: emailSettings.requestDelayDays,
      reminderEnabled: emailSettings.reminderEnabled,
      reminderDelayDays: emailSettings.reminderDelayDays,
      emailSubject: emailSettings.emailSubject,
    },
    widgetSettings,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const url = new URL(request.url);
  const preserved = new URLSearchParams(url.searchParams);
  preserved.delete("screen");
  const preservedQuery = preserved.toString();

  try {
    switch (intent) {
      case "start": {
        await onboardingService.markStarted(shop.id);
        throw redirect(screenHref("health", preservedQuery));
      }
      case "continue-checklist": {
        throw redirect(screenHref("checklist", preservedQuery));
      }
      case "skip": {
        await onboardingService.skipOnboarding(shop.id);
        throw redirect("/app");
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
            : "Not detected yet. Enable the app embed, save, then wait.",
        });
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
          fileContent: buffer,
        });
        const status = await onboardingService.markReviewsImported(shop.id);
        return data({
          ok: true as const,
          status,
          message: `Imported ${job.importedRows} reviews${
            job.failedRows > 0
              ? ` (${job.failedRows} rows skipped).`
              : "."
          }`,
        });
      }
      case "save-automation": {
        const existing = await reviewRequestService.getSettingsForShop(shop.id);
        const requestDelayDays = Number(form.get("requestDelayDays") ?? 5);
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

        const status = await onboardingService.markAutomationConfigured(shop.id);
        return data({
          ok: true as const,
          status,
          message: "Automation enabled.",
        });
      }
      case "save-branding": {
        const current = await widgetSettingsService.getForShop(shop.id);
        const accentColor = String(
          form.get("accentColor") ?? current.accentColor,
        );
        const borderRadius = Number(
          form.get("borderRadius") ?? current.borderRadius,
        );
        await widgetSettingsService.updateForShop(shop.id, {
          widgetEnabled: current.widgetEnabled,
          accentColor,
          primaryButtonColor: current.primaryButtonColor,
          starColor: String(form.get("starColor") ?? accentColor),
          borderRadius: Number.isFinite(borderRadius)
            ? borderRadius
            : current.borderRadius,
          cardShadow: current.cardShadow,
          layout: current.layout,
          showCustomerName: current.showCustomerName,
          showReviewDate: current.showReviewDate,
          showProductImages: current.showProductImages,
          showCustomerPhotos: current.showCustomerPhotos,
          autoPublishReviews: current.autoPublishReviews,
          darkMode: current.darkMode,
          showReviewForm: current.showReviewForm,
          reviewsPerPage: current.reviewsPerPage,
        });
        const status = await onboardingService.markBrandingConfigured(shop.id);
        return data({
          ok: true as const,
          status,
          message: "Branding saved.",
        });
      }
      case "skip-optional": {
        const task = String(form.get("task") ?? "");
        if (task !== "import" && task !== "automation" && task !== "branding") {
          return data(
            { ok: false as const, message: "Invalid optional task." },
            { status: 400 },
          );
        }
        await onboardingService.skipOptional(shop.id, task);
        throw redirect(screenHref("checklist", preservedQuery));
      }
      case "complete": {
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
    const status =
      actionData && "status" in actionData ? actionData.status : null;
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
              message:
                "message" in actionData ? actionData.message : undefined,
              status: "status" in actionData ? actionData.status : undefined,
            }
          : undefined
      }
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
