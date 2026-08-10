import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

const SUPPORT_EMAIL = "support@reviewtrix.algorithmtrix.com";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  return {
    shopDomain: shop.shopDomain,
    supportEmail: SUPPORT_EMAIL,
  };
};

export default function SupportRoute() {
  const { shopDomain, supportEmail } = useLoaderData<typeof loader>();
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    `ReviewTrix support — ${shopDomain}`,
  )}&body=${encodeURIComponent(
    [
      `Shop domain: ${shopDomain}`,
      "Approximate time of the issue:",
      "What you were trying to do:",
      "",
    ].join("\n"),
  )}`;

  return (
    <s-page heading="Support">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Talk to the ReviewTrix team for install help, widget setup,
          moderation, imports, email requests, or billing questions.
        </s-text>

        <s-section heading="Contact">
          <s-stack direction="block" gap="base">
            <s-text>
              Email{" "}
              <s-link href={`mailto:${supportEmail}`}>{supportEmail}</s-link>
              . Your shop domain is prefilled below so we can find your account
              quickly.
            </s-text>
            <s-text>
              <strong>Shop domain:</strong> {shopDomain}
            </s-text>
            <s-button href={mailtoHref} variant="primary">
              Email support
            </s-button>
          </s-stack>
        </s-section>

        <s-section heading="Include when you write">
          <s-unordered-list>
            <s-list-item>
              Shop domain (for example {shopDomain})
            </s-list-item>
            <s-list-item>Approximate time of the issue</s-list-item>
            <s-list-item>
              What you were trying to do (install, widget, moderation, import,
              email, or billing)
            </s-list-item>
          </s-unordered-list>
          <s-text color="subdued">
            Do not send customer passwords or full CSV files with personal data
            over insecure channels.
          </s-text>
        </s-section>

        <s-section heading="Legal">
          <s-stack direction="inline" gap="base">
            <s-link href="/privacy" target="_blank">
              Privacy policy
            </s-link>
            <s-link href="/terms" target="_blank">
              Terms of service
            </s-link>
            <Link to="/app/billing">Plans</Link>
            <Link to="/app/settings">Settings</Link>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Support could not be loaded.";

  return (
    <s-page heading="Support">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
