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
  PRO_MAX_PUBLISHED_REVIEWS,
  PRO_MONTHLY_PRICE_USD,
  PRO_TRIAL_DAYS,
} from "../features/billing/billing.constants";
import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { billingSyncService } from "../features/billing/billing-sync.service.server";
import { isBillingTestMode } from "../lib/billing-env.server";
import {
  requireShopRecord,
  requireShopWithBillingSync,
} from "../lib/shop-context.server";
import { authenticate, PRO_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const isTest = isBillingTestMode();
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest,
    forceSync: true,
  });

  const usage = await billingEntitlementsService.getPublishedReviewUsage({
    shopId: shop.id,
    shopPlan: shop.plan,
  });

  return {
    shopPlan: shop.plan,
    billingStatus: shop.billingStatus,
    billingSyncedAt: shop.billingSyncedAt?.toISOString() ?? null,
    usage,
    isTest,
    plans: {
      free: {
        price: 0,
        publishedReviews: FREE_MAX_PUBLISHED_REVIEWS,
        reviewRequests: 50,
      },
      pro: {
        price: PRO_MONTHLY_PRICE_USD,
        trialDays: PRO_TRIAL_DAYS,
        publishedReviews: PRO_MAX_PUBLISHED_REVIEWS,
        reviewRequests: 1_000,
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
    await billingSyncService.syncFromShopify({
      shopId: shop.id,
      billing,
      isTest,
    });

    return { ok: true as const, message: "Billing status refreshed." };
  }

  if (intent === "upgrade") {
    return billing.request({
      plan: PRO_PLAN,
      isTest,
      trialDays: PRO_TRIAL_DAYS,
      returnUrl: "/app/billing",
    });
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
          To downgrade or cancel Pro, change your plan in Shopify Admin billing.
          Existing approved reviews stay visible. New approvals are limited to
          your active plan allowance.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
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
