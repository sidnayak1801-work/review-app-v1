import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

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

  try {
    await widgetSettingsService.updateForShop(shop.id, {
      widgetEnabled: formData.get("widgetEnabled") === "on",
      accentColor: formData.get("accentColor"),
      primaryButtonColor: formData.get("primaryButtonColor"),
      starColor: formData.get("starColor"),
      borderRadius: formData.get("borderRadius"),
      cardShadow: formData.get("cardShadow") === "on",
      layout: formData.get("layout"),
      showCustomerName: formData.get("showCustomerName") === "on",
      showReviewDate: formData.get("showReviewDate") === "on",
      showProductImages: formData.get("showProductImages") === "on",
      showCustomerPhotos: formData.get("showCustomerPhotos") === "on",
      autoPublishReviews: formData.get("autoPublishReviews") === "on",
      darkMode: formData.get("darkMode") === "on",
      showReviewForm: formData.get("showReviewForm") === "on",
      reviewsPerPage: formData.get("reviewsPerPage"),
    });

    return { ok: true as const, message: "Widget settings saved." };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        message: error.message,
        issues: error.issues,
      };
    }

    if (error instanceof DomainError) {
      return { ok: false as const, message: error.message };
    }

    throw error;
  }
};

export default function WidgetSettingsRoute() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <s-page heading="Widget settings">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Customize how reviews appear on your storefront. You can also edit
          these on the Home dashboard with a live preview.
        </s-text>

        {actionData ? (
          <s-banner
            heading={actionData.ok ? "Saved" : "Could not save"}
            tone={actionData.ok ? "success" : "critical"}
          >
            {actionData.message}
            {actionData.issues?.length ? (
              <s-unordered-list>
                {actionData.issues.map((issue) => (
                  <s-list-item key={issue}>{issue}</s-list-item>
                ))}
              </s-unordered-list>
            ) : null}
          </s-banner>
        ) : null}

        <Form method="post">
          <s-stack direction="block" gap="base">
            <s-box padding="base" border="base" borderRadius="large" background="subdued">
              <s-stack direction="block" gap="base">
                <s-text type="strong">Display</s-text>
                <s-checkbox
                  name="widgetEnabled"
                  label="Widget enabled"
                  checked={settings.widgetEnabled}
                />
                <s-checkbox
                  name="showReviewForm"
                  label="Show review submission form"
                  checked={settings.showReviewForm}
                />
                <s-checkbox
                  name="showCustomerName"
                  label="Show customer name"
                  checked={settings.showCustomerName}
                />
                <s-checkbox
                  name="showReviewDate"
                  label="Show review date"
                  checked={settings.showReviewDate}
                />
                <s-checkbox
                  name="showProductImages"
                  label="Show product images"
                  checked={settings.showProductImages}
                />
                <s-checkbox
                  name="showCustomerPhotos"
                  label="Show customer photos"
                  checked={settings.showCustomerPhotos}
                />
                <s-select
                  label="Reviews per page"
                  name="reviewsPerPage"
                  value={String(settings.reviewsPerPage)}
                >
                  <s-option value="5">5</s-option>
                  <s-option value="10">10</s-option>
                  <s-option value="20">20</s-option>
                  <s-option value="50">50</s-option>
                </s-select>
              </s-stack>
            </s-box>

            <s-box padding="base" border="base" borderRadius="large" background="subdued">
              <s-stack direction="block" gap="base">
                <s-text type="strong">Colors & style</s-text>
                <s-text-field
                  label="Accent color"
                  name="accentColor"
                  value={settings.accentColor}
                />
                <s-text-field
                  label="Primary button color"
                  name="primaryButtonColor"
                  value={settings.primaryButtonColor}
                />
                <s-text-field
                  label="Star color"
                  name="starColor"
                  value={settings.starColor}
                />
                <s-text-field
                  label="Border radius (0–20)"
                  name="borderRadius"
                  value={String(settings.borderRadius)}
                />
                <s-checkbox
                  name="cardShadow"
                  label="Card shadow"
                  checked={settings.cardShadow}
                />
                <s-checkbox
                  name="darkMode"
                  label="Dark mode"
                  checked={settings.darkMode}
                />
              </s-stack>
            </s-box>

            <s-box padding="base" border="base" borderRadius="large" background="subdued">
              <s-stack direction="block" gap="base">
                <s-text type="strong">Layout & behavior</s-text>
                <s-select label="Layout" name="layout" value={settings.layout}>
                  <s-option value="STACKED">Stacked</s-option>
                  <s-option value="COMPACT">Compact</s-option>
                  <s-option value="GRID">Grid</s-option>
                </s-select>
                <s-checkbox
                  name="autoPublishReviews"
                  label="Auto publish reviews"
                  checked={settings.autoPublishReviews}
                />
              </s-stack>
            </s-box>

            <s-button
              type="submit"
              variant="primary"
              disabled={navigation.state === "submitting"}
            >
              Save settings
            </s-button>
          </s-stack>
        </Form>

        <s-box padding="base" border="base" borderRadius="large">
          <s-stack direction="block" gap="small">
            <s-text type="strong">Theme setup</s-text>
            <s-text color="subdued">
              Online Store → Themes → Customize → add Product Reviews / Star
              Rating blocks to your product template.
            </s-text>
            <s-button href="/app" variant="secondary">
              Edit with live preview on Home
            </s-button>
          </s-stack>
        </s-box>
      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Widget settings could not be loaded.";

  return (
    <s-page heading="Widget settings">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
