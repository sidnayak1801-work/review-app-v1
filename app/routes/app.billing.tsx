import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  FREE_MAX_PUBLISHED_REVIEWS,
  FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
  PRO_MAX_PUBLISHED_REVIEWS,
  PRO_MAX_REVIEW_REQUESTS_PER_MONTH,
  PRO_MONTHLY_PRICE_USD,
  PRO_TRIAL_DAYS,
} from "../features/billing/billing.constants";
import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { billingSyncService } from "../features/billing/billing-sync.service.server";
import { isBillingTestMode } from "../lib/billing-env.server";
import { getShopifyEnv } from "../lib/env.server";
import {
  requireShopRecord,
  requireShopWithBillingSync,
} from "../lib/shop-context.server";
import { logger } from "../services/logger.server";
import { authenticate, PRO_PLAN } from "../shopify.server";

function billingErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Could not start the Pro upgrade. Please try again.";
  }

  const message = error.message;
  const nested =
    "errorData" in error && Array.isArray(error.errorData)
      ? error.errorData
          .map((entry) =>
            typeof entry === "object" &&
            entry !== null &&
            "message" in entry &&
            typeof entry.message === "string"
              ? entry.message
              : null,
          )
          .filter((value): value is string => Boolean(value))
          .join(" ")
      : "";

  const combined = `${message} ${nested}`;

  if (combined.includes("public distribution")) {
    return "Shopify Billing requires this app to use public (App Store) distribution. In Partner Dashboard → your app → Distribution, choose Shopify App Store / public distribution, then try Upgrade again.";
  }

  return nested || message || "Could not start the Pro upgrade. Please try again.";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const isTest = isBillingTestMode();
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest,
    forceSync: true,
  });

  const [usage, reviewRequestUsage] = await Promise.all([
    billingEntitlementsService.getPublishedReviewUsage({
      shopId: shop.id,
      shopPlan: shop.plan,
    }),
    billingEntitlementsService.getReviewRequestUsage({
      shopId: shop.id,
      shopPlan: shop.plan,
    }),
  ]);

  return {
    shopPlan: shop.plan,
    billingStatus: shop.billingStatus,
    billingSyncedAt: shop.billingSyncedAt?.toISOString() ?? null,
    usage,
    reviewRequestUsage,
    isTest,
    plans: {
      free: {
        price: 0,
        publishedReviews: FREE_MAX_PUBLISHED_REVIEWS,
        reviewRequests: FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
      },
      pro: {
        price: PRO_MONTHLY_PRICE_USD,
        trialDays: PRO_TRIAL_DAYS,
        publishedReviews: PRO_MAX_PUBLISHED_REVIEWS,
        reviewRequests: PRO_MAX_REVIEW_REQUESTS_PER_MONTH,
      },
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const isTest = isBillingTestMode();

  if (intent === "sync") {
    try {
      await billingSyncService.syncFromShopify({
        shopId: shop.id,
        billing,
        isTest,
      });
      return { ok: true as const, message: "Billing status refreshed." };
    } catch (error) {
      logger.warn("Manual billing sync failed", {
        shopId: shop.id,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        ok: false as const,
        message: billingErrorMessage(error),
      };
    }
  }

  if (intent === "upgrade") {
    const returnUrl = new URL(
      "/app/billing",
      getShopifyEnv().SHOPIFY_APP_URL,
    ).href;

    try {
      // Throws a redirect Response when Shopify approval URL is ready.
      return await billing.request({
        plan: PRO_PLAN,
        isTest,
        trialDays: PRO_TRIAL_DAYS,
        returnUrl,
      });
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      logger.warn("Billing upgrade request failed", {
        shopId: shop.id,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        ok: false as const,
        message: billingErrorMessage(error),
      };
    }
  }

  return { ok: false as const, message: "Unknown action." };
};

export default function BillingRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isPro = data.shopPlan === "PRO";

  return (
    <s-page heading="Billing">
      {actionData?.message ? (
        <s-banner
          heading={actionData.ok ? "Updated" : "Could not update"}
          tone={actionData.ok ? "success" : "critical"}
        >
          {actionData.message}
        </s-banner>
      ) : null}

      <s-section heading="Current plan">
        <s-stack direction="block" gap="base">
          <s-text type="strong">{isPro ? "Pro" : "Free"} plan</s-text>
          <s-paragraph>
            Billing status: {data.billingStatus ?? "Unknown"}
          </s-paragraph>
          {data.billingSyncedAt ? (
            <s-paragraph>
              Last synced: {new Date(data.billingSyncedAt).toLocaleString()}
            </s-paragraph>
          ) : null}
          <s-paragraph>
            Published reviews: {data.usage.used}
            {data.usage.limit !== null ? ` / ${data.usage.limit}` : ""}
          </s-paragraph>
          <s-paragraph>
            Review-request emails this month: {data.reviewRequestUsage.used} /{" "}
            {data.reviewRequestUsage.limit}
          </s-paragraph>
          {data.isTest ? (
            <s-banner tone="info" heading="Test billing mode">
              Charges are created in Shopify test mode.
            </s-banner>
          ) : null}
        </s-stack>
      </s-section>

      <s-section heading="Plans">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Free — $0</s-text>
              <s-paragraph>
                Up to {data.plans.free.publishedReviews} published reviews and{" "}
                {data.plans.free.reviewRequests} review-request emails per
                month.
              </s-paragraph>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">
                Pro — ${data.plans.pro.price}/month
              </s-text>
              <s-paragraph>
                {data.plans.pro.trialDays}-day trial. Up to{" "}
                {data.plans.pro.publishedReviews.toLocaleString()} published
                reviews and {data.plans.pro.reviewRequests.toLocaleString()}{" "}
                review-request emails per month.
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Manage plan">
        <s-stack direction="inline" gap="small">
          {!isPro ? (
            <Form method="post">
              <input type="hidden" name="intent" value="upgrade" />
              <s-button
                type="submit"
                variant="primary"
                disabled={navigation.state !== "idle"}
              >
                Upgrade to Pro
              </s-button>
            </Form>
          ) : null}
          <Form method="post">
            <input type="hidden" name="intent" value="sync" />
            <s-button
              type="submit"
              variant="secondary"
              disabled={navigation.state !== "idle"}
            >
              Refresh billing status
            </s-button>
          </Form>
        </s-stack>
        <s-paragraph>
          Upgrade sends you to Shopify to approve the Pro subscription. After
          you approve, Shopify returns here and we sync your plan to unlock Pro
          limits. To downgrade or cancel, change the plan in Shopify Admin
          billing — existing approved reviews stay visible.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Billing could not be loaded.";

  return (
    <s-page heading="Billing">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
