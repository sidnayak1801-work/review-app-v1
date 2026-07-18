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
      accentColor: settings.accentColor,
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
      accentColor: formData.get("accentColor"),
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

      <s-section heading="Display">
        <Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Accent color"
              name="accentColor"
              value={settings.accentColor}
              details="Hex color used by storefront widgets"
            />
            <s-text-field
              label="Reviews per page"
              name="reviewsPerPage"
              value={String(settings.reviewsPerPage)}
              details="Enter a number from 1 to 20"
            />
            <s-checkbox
              name="showReviewForm"
              label="Show review submission form"
              checked={settings.showReviewForm}
            />
            <s-button
              type="submit"
              variant="primary"
              disabled={navigation.state !== "idle"}
            >
              Save settings
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Theme setup">
        <s-unordered-list>
          <s-list-item>
            Open Online Store → Themes → Customize → App embeds.
          </s-list-item>
          <s-list-item>
            Enable the Review App embeds and add the Star Rating or Product
            Reviews block to product templates.
          </s-list-item>
          <s-list-item>
            Keep `shopify app dev` running so the extension appears in the
            theme editor.
          </s-list-item>
        </s-unordered-list>
      </s-section>
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
