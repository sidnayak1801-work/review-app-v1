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

import {
  ApiDocsPage,
  type ApiDocsActionData,
} from "../features/public-api/components/api-docs-page";
import { apiTokenService } from "../features/public-api/api-token.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { getAppBaseUrl } from "../lib/email-env.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const tokens = await apiTokenService.listForShop(shop.id);

  let appOrigin: string;
  try {
    appOrigin = getAppBaseUrl();
  } catch {
    appOrigin = new URL(request.url).origin;
  }

  return { tokens, appOrigin };
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ApiDocsActionData> => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const raw = Object.fromEntries(formData);

  try {
    if (intent === "create") {
      const result = await apiTokenService.create(shop.id, raw);
      return {
        ok: true,
        message: "API token created. Copy the secret now — it will not be shown again.",
        secret: result.secret,
        token: result.token,
      };
    }

    if (intent === "revoke") {
      await apiTokenService.revoke(shop.id, raw);
      return {
        ok: true,
        message: "API token revoked.",
      };
    }

    if (intent === "rotate") {
      const result = await apiTokenService.rotate(shop.id, raw);
      return {
        ok: true,
        message:
          "Token rotated. Copy the new secret now — the previous token is revoked.",
        secret: result.secret,
        token: result.token,
      };
    }

    return { ok: false, message: "Unknown action." };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false,
        message: error.message,
        issues: error.issues,
      };
    }
    if (error instanceof DomainError) {
      return {
        ok: false,
        message: error.message,
      };
    }
    throw error;
  }
};

export default function ApiDocsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <ApiDocsPage
      tokens={data.tokens}
      appOrigin={data.appOrigin}
      actionData={actionData}
      isSubmitting={isSubmitting}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <s-page heading="API">
        <s-banner tone="critical" heading="Could not load API settings">
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
