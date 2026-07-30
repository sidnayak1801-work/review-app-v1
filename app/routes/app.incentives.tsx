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

import { IncentivesPage } from "../features/incentives/components/incentives-page";
import { incentiveService } from "../features/incentives/incentive.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const campaign = await incentiveService.getAdminCampaignForShop(shop.id);

  return { campaign };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent !== "save-settings") {
    return {
      ok: false as const,
      message: "Unknown action.",
    };
  }

  try {
    await incentiveService.upsertPostReviewCampaign(
      shop.id,
      Object.fromEntries(formData),
    );

    return {
      ok: true as const,
      message: "Incentives saved successfully!",
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        message: error.message,
        issues: error.issues,
      };
    }
    if (error instanceof DomainError) {
      return {
        ok: false as const,
        message: error.message,
      };
    }
    throw error;
  }
};

export default function IncentivesRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "save-settings";

  return (
    <IncentivesPage
      campaign={data.campaign}
      actionData={actionData}
      isSubmitting={isSubmitting}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <s-page heading="Incentives">
        <s-banner tone="critical" heading="Something went wrong">
          {error.status} {error.statusText}
        </s-banner>
      </s-page>
    );
  }
  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
