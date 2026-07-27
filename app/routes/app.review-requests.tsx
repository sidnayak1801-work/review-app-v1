import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { ReviewRequestsPage } from "../features/review-requests/components/review-requests-page";
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const [requests, reviewRequestUsage, settings] = await Promise.all([
    reviewRequestService.listRecentForShop(shop.id),
    billingEntitlementsService.getReviewRequestUsage({
      shopId: shop.id,
      shopPlan: shop.plan,
    }),
    reviewRequestService.getSettingsForShop(shop.id),
  ]);

  return {
    shopPlan: shop.plan,
    reviewRequestUsage,
    settings: {
      requestDelayDays: settings.requestDelayDays,
      domesticDelayDays: settings.domesticDelayDays,
      internationalDelayDays: settings.internationalDelayDays,
      homeCountryCode: settings.homeCountryCode,
      emailSubject: settings.emailSubject,
      emailBodyHtml: settings.emailBodyHtml,
      reminderEnabled: settings.reminderEnabled,
      reminderDelayDays: settings.reminderDelayDays,
      reminderSubject: settings.reminderSubject,
      reminderBodyHtml: settings.reminderBodyHtml,
    },
    requests: requests.map((item) => ({
      id: item.id,
      shopifyOrderId: item.shopifyOrderId,
      shopifyProductId: item.shopifyProductId,
      customerEmail: item.customerEmail,
      status: item.status,
      scheduledAt: item.scheduledAt.toISOString(),
      sentAt: item.sentAt?.toISOString() ?? null,
      reminderSentAt: item.reminderSentAt?.toISOString() ?? null,
      attemptCount: item.attemptCount,
      lastErrorCode: item.lastErrorCode,
      createdAt: item.createdAt.toISOString(),
    })),
  };
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
    await reviewRequestService.updateSettingsForShop(
      shop.id,
      shop.plan,
      Object.fromEntries(formData),
    );

    return {
      ok: true as const,
      message: "Review request settings saved.",
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

export default function ReviewRequestsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <ReviewRequestsPage
      requests={data.requests}
      reviewRequestUsage={data.reviewRequestUsage}
      shopPlan={data.shopPlan}
      settings={data.settings}
      actionData={actionData}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Review requests could not be loaded.";

  return (
    <s-page heading="Review requests">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
