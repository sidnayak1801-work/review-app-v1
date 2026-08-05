import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useRouteError,
} from "react-router";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { MerchantAppShell } from "../features/dashboard/components/reviewtrix/MerchantAppShell";
import { onboardingService } from "../features/onboarding/onboarding.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import type { ShopPlan } from "../repositories/shop.repository.server";
import { authenticate, shopifyApiKey } from "../shopify.server";

/**
 * Parent authenticates once per document load so App Bridge session tokens
 * work. Revalidate when onboarding forms run so the gate stays accurate.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const onboarding = await onboardingService.getStatus(shop.id);
  const url = new URL(request.url);
  const onOnboarding = url.pathname.includes("/app/onboarding");

  if (onboarding.needsOnboarding && !onOnboarding) {
    throw redirect(`/app/onboarding${url.search}`);
  }

  if (!onboarding.needsOnboarding && onOnboarding) {
    throw redirect(`/app${url.search}`);
  }

  const plan: ShopPlan = shop.plan ?? "FREE";
  return {
    apiKey: shopifyApiKey,
    shopDomain: session.shop,
    plan,
    needsOnboarding: onboarding.needsOnboarding,
  };
};

export function shouldRevalidate({
  formAction,
  currentUrl,
  nextUrl,
}: {
  formAction?: string | null;
  currentUrl: URL;
  nextUrl: URL;
}) {
  if (
    formAction?.includes("onboarding") ||
    currentUrl.pathname.includes("/app/onboarding") ||
    nextUrl.pathname.includes("/app/onboarding")
  ) {
    return true;
  }
  return false;
}

function AppNavigationChrome() {
  const { shopDomain, plan, needsOnboarding } = useLoaderData<typeof loader>();
  const location = useLocation();
  const onOnboarding = location.pathname.includes("/app/onboarding");

  if (needsOnboarding && onOnboarding) {
    return <Outlet />;
  }

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
