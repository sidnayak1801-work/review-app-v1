import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { MerchantAppShell } from "../features/dashboard/components/reviewx/MerchantAppShell";
import { shopService } from "../features/shops/shop.service.server";
import type { ShopPlan } from "../repositories/shop.repository.server";
import { authenticate, shopifyApiKey } from "../shopify.server";

/**
 * Parent authenticates once per document load so App Bridge session tokens
 * work. shouldRevalidate=false keeps child navigations from re-running this.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await shopService.findByDomain(session.shop);
  const plan: ShopPlan = shop?.plan ?? "FREE";
  return {
    apiKey: shopifyApiKey,
    shopDomain: session.shop,
    plan,
  };
};

/** Parent only returns static shell data — skip revalidation on every child nav. */
export function shouldRevalidate() {
  return false;
}

function AppNavigationChrome() {
  const { shopDomain, plan } = useLoaderData<typeof loader>();

  return (
    <>
      <NavMenu>
        <Link to="/app" rel="home" prefetch="intent">
          Dashboard
        </Link>
        <Link to="/app/reviews" prefetch="intent">
          Reviews
        </Link>
        <Link to="/app/questions" prefetch="intent">
          Q&A
        </Link>
        <Link to="/app/review-requests" prefetch="intent">
          Review requests
        </Link>
        <Link to="/app/incentives" prefetch="intent">
          Incentives
        </Link>
        <Link to="/app/integrations" prefetch="intent">
          Integrations
        </Link>
        <Link to="/app/api" prefetch="intent">
          API
        </Link>
        <Link to="/app/imports" prefetch="intent">
          Imports
        </Link>
        <Link to="/app/billing" prefetch="intent">
          Billing
        </Link>
        <Link to="/app/settings" prefetch="intent">
          Widget settings
        </Link>
      </NavMenu>
      <MerchantAppShell shopDomain={shopDomain} plan={plan}>
        <Outlet />
      </MerchantAppShell>
    </>
  );
}

export default function EmbeddedAppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <AppNavigationChrome />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
