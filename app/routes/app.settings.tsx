import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { reasonsFromFormData } from "../features/uninstall/uninstall.schema";
import { uninstallFeedbackService } from "../features/uninstall/uninstall.service.server";
import { SettingsPage } from "../features/widget-settings/components/settings-page";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";
import { SaveSuccessModal } from "../components/save-success-modal";
import { useSaveSuccessModal } from "../components/use-save-success-modal";
import styles from "../features/dashboard/components/reviewx/dashboard.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const settings = await widgetSettingsService.getForShop(shop.id);

  return {
    shopDomain: shop.shopDomain,
    settings: {
      widgetEnabled: settings.widgetEnabled,
      accentColor: settings.accentColor,
      primaryButtonColor: settings.primaryButtonColor,
      starColor: settings.starColor,
      borderRadius: settings.borderRadius,
      cardShadow: settings.cardShadow,
      layout: settings.layout,
      showCustomerName: settings.showCustomerName,
      showReviewDate: settings.showReviewDate,
      showProductImages: settings.showProductImages,
      showCustomerPhotos: settings.showCustomerPhotos,
      autoPublishReviews: settings.autoPublishReviews,
      darkMode: settings.darkMode,
      showReviewForm: settings.showReviewForm,
      reviewsPerPage: settings.reviewsPerPage,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "saveWidgetSettings");

  try {
    if (intent === "uninstallFeedback") {
      await uninstallFeedbackService.submit(shop.id, {
        reasons: reasonsFromFormData(formData),
        details: formData.get("details"),
      });
      return { ok: true as const, intent: "uninstallFeedback" as const };
    }

    // Schema accepts both "on"/"true" form booleans (Home + Settings).
    await widgetSettingsService.updateForShop(shop.id, {
      widgetEnabled: formData.get("widgetEnabled"),
      accentColor: formData.get("accentColor"),
      primaryButtonColor: formData.get("primaryButtonColor"),
      starColor: formData.get("starColor"),
      borderRadius: formData.get("borderRadius"),
      cardShadow: formData.get("cardShadow"),
      layout: formData.get("layout"),
      showCustomerName: formData.get("showCustomerName"),
      showReviewDate: formData.get("showReviewDate"),
      showProductImages: formData.get("showProductImages"),
      showCustomerPhotos: formData.get("showCustomerPhotos"),
      autoPublishReviews: formData.get("autoPublishReviews"),
      darkMode: formData.get("darkMode"),
      showReviewForm: formData.get("showReviewForm"),
      reviewsPerPage: formData.get("reviewsPerPage"),
    });

    return {
      ok: true as const,
      intent: "saveWidgetSettings" as const,
      message: "Widget changes saved successfully!",
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        intent: intent as "uninstallFeedback" | "saveWidgetSettings",
        message: error.message,
        issues: error.issues,
      };
    }

    if (error instanceof DomainError) {
      return {
        ok: false as const,
        intent: intent as "uninstallFeedback" | "saveWidgetSettings",
        message: error.message,
      };
    }

    throw error;
  }
};

export default function WidgetSettingsRoute() {
  const { settings, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "saveWidgetSettings";

  const saveActionData =
    actionData && actionData.intent !== "uninstallFeedback"
      ? actionData
      : undefined;

  const saveFeedback = saveActionData
    ? {
        ok: saveActionData.ok,
        message:
          "message" in saveActionData && saveActionData.message
            ? saveActionData.message
            : saveActionData.ok
              ? "Widget changes saved successfully!"
              : "Could not save settings.",
        issues:
          "issues" in saveActionData ? saveActionData.issues : undefined,
      }
    : undefined;

  const saveSuccess = useSaveSuccessModal(
    saveFeedback,
    isSubmitting,
    "Widget changes saved successfully!",
  );

  return (
    <>
      <SettingsPage
        shopDomain={shopDomain}
        initialSettings={settings}
        actionMessage={
          saveFeedback && !saveFeedback.ok ? saveFeedback : undefined
        }
        isSubmitting={isSubmitting}
      />
      <SaveSuccessModal
        open={saveSuccess.open}
        message={saveSuccess.message}
        onClose={saveSuccess.close}
      />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Widget settings could not be loaded.";

  return (
    <div className={styles.content}>
      <div
        className={styles.card}
        style={{
          padding: 20,
          borderColor: "rgba(215,44,13,0.35)",
          color: "var(--rx-danger)",
        }}
        role="alert"
      >
        <h1 className={styles.sectionTitle}>Widget settings</h1>
        <p className={styles.body} style={{ marginTop: 8, color: "inherit" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
