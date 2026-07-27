import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Link,
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { NavMenu, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { AppNavigationPending } from "../components/app-navigation-pending";
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
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isNavigating =
    navigation.state === "loading" || navigation.state === "submitting";

  useEffect(() => {
    shopify.loading(isNavigating);
    return () => {
      shopify.loading(false);
    };
  }, [isNavigating, shopify]);

  return (
    <>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/reviews">Reviews</Link>
        <Link to="/app/questions">Q&A</Link>
        <Link to="/app/review-requests">Review requests</Link>
        <Link to="/app/incentives">Incentives</Link>
        <Link to="/app/integrations">Integrations</Link>
        <Link to="/app/api">API</Link>
        <Link to="/app/imports">Imports</Link>
        <Link to="/app/billing">Billing</Link>
        <Link to="/app/settings">Widget settings</Link>
      </NavMenu>
      <MerchantAppShell shopDomain={shopDomain} plan={plan}>
        <AppNavigationPending>
          <Outlet />
        </AppNavigationPending>
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
