import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { FoundationDashboardShell } from "../features/dashboard/components/foundation-dashboard-shell";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return { shopDomain: session.shop };
};

export default function AppIndex() {
  const { shopDomain } = useLoaderData<typeof loader>();

  return <FoundationDashboardShell shopDomain={shopDomain} />;
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
