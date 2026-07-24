import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { NavMenu, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate, shopifyApiKey } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: shopifyApiKey };
};

/** Parent only returns a static apiKey — skip re-auth on every child nav. */
export function shouldRevalidate() {
  return false;
}

function AppNavigationChrome() {
  const navigation = useNavigation();
  const shopify = useAppBridge();

  useEffect(() => {
    const busy = navigation.state !== "idle";
    shopify.loading(busy);
    return () => {
      shopify.loading(false);
    };
  }, [navigation.state, shopify]);

  return (
    <>
      <NavMenu>
        <a href="/app" rel="home">
          Home
        </a>
        <a href="/app/reviews">Reviews</a>
        <a href="/app/questions">Q&A</a>
        <a href="/app/review-requests">Review requests</a>
        <a href="/app/imports">Imports</a>
        <a href="/app/billing">Billing</a>
        <a href="/app/settings">Widget settings</a>
      </NavMenu>
      <Outlet />
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
