import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { FoundationDashboardShell } from "../features/dashboard/components/foundation-dashboard-shell";
import { reviewService } from "../features/reviews/review.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const reviews = await reviewService.listForShop(shop.id, { limit: 5 });

  return {
    shopDomain: shop.shopDomain,
    status: shop.status,
    installedAt: shop.installedAt.toISOString(),
    uninstalledAt: shop.uninstalledAt?.toISOString() ?? null,
    recentReviewCount: reviews.items.length,
  };
};

export default function AppIndex() {
  const shop = useLoaderData<typeof loader>();

  return <FoundationDashboardShell shop={shop} />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "The dashboard could not be loaded. Please try again.";

  return (
    <s-page heading="Review App">
      <s-banner heading="Dashboard unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
