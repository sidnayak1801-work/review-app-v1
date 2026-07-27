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

import { IntegrationsPage } from "../features/integrations/components/integrations-page";
import { integrationService } from "../features/integrations/integration.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const integrations = await integrationService.listAdminCardsForShop(shop.id);
  return { integrations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const raw = Object.fromEntries(formData);

  try {
    if (intent === "connect") {
      await integrationService.connect(shop.id, raw);
      return {
        ok: true as const,
        message: "Integration connected.",
        provider: String(formData.get("provider") ?? ""),
      };
    }

    if (intent === "test") {
      await integrationService.testConnection(shop.id, raw);
      return {
        ok: true as const,
        message: "Connection test succeeded.",
        provider: String(formData.get("provider") ?? ""),
      };
    }

    if (intent === "disconnect") {
      await integrationService.disconnect(shop.id, raw);
      return {
        ok: true as const,
        message: "Integration disconnected.",
        provider: String(formData.get("provider") ?? ""),
      };
    }

    return {
      ok: false as const,
      message: "Unknown action.",
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        message: error.message,
        issues: error.issues,
        provider: String(formData.get("provider") ?? ""),
      };
    }
    if (error instanceof DomainError) {
      return {
        ok: false as const,
        message: error.message,
        provider: String(formData.get("provider") ?? ""),
      };
    }
    throw error;
  }
};

export default function IntegrationsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <IntegrationsPage
      integrations={data.integrations}
      actionData={actionData}
      isSubmitting={isSubmitting}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <s-page heading="Integrations">
        <s-banner tone="critical" heading="Could not load integrations">
          {error.data}
        </s-banner>
      </s-page>
    );
  }

  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
