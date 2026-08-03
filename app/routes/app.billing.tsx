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
import styles from "../features/billing/billing-page.module.css";
import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { billingSyncService } from "../features/billing/billing-sync.service.server";
import { isBillingTestMode } from "../lib/billing-env.server";
import { getShopifyEnv } from "../lib/env.server";
import { requireShopRecord } from "../lib/shop-context.server";
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

function formatPlanDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const isTest = isBillingTestMode();
  const shopRecord = await requireShopRecord(session.shop);
  const { shop, proSubscription } = await billingSyncService.syncFromShopify({
    shopId: shopRecord.id,
    billing,
    isTest,
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

  const subscription =
    shop.plan === "PRO" && proSubscription
      ? {
          boughtOn: proSubscription.createdAt,
          expiresAt: proSubscription.currentPeriodEnd,
          validForLabel: "Valid for 1 month" as const,
        }
      : null;

  return {
    shopPlan: shop.plan,
    billingStatus: shop.billingStatus,
    billingSyncedAt: shop.billingSyncedAt?.toISOString() ?? null,
    subscription,
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
  const subscription = data.subscription;

  return (
    <s-page heading="Billing">
      <s-stack direction="block" gap="large">
        <s-text color="subdued">
          Manage your plan and published-review allowances.
        </s-text>

        {actionData?.message ? (
          <s-banner
            heading={actionData.ok ? "Updated" : "Could not update"}
            tone={actionData.ok ? "success" : "critical"}
          >
            {actionData.message}
          </s-banner>
        ) : null}

        <s-box
          padding="base"
          border="base"
          borderRadius="large"
          background="subdued"
        >
          <div className={styles.summaryRow}>
            <div className={styles.summaryMain}>
              <s-stack direction="block" gap="small">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-heading>{isPro ? "Pro" : "Free"}</s-heading>
                  <s-badge tone={isPro ? "success" : "info"}>
                    {data.billingStatus ?? "Active"}
                  </s-badge>
                </s-stack>
                <s-text>
                  Published reviews: {data.usage.used}
                  {data.usage.limit !== null
                    ? ` / ${data.usage.limit}`
                    : " · unlimited"}
                </s-text>
                <s-text>
                  Review-request emails this month:{" "}
                  {data.reviewRequestUsage.used} / {data.reviewRequestUsage.limit}
                </s-text>
                {data.billingSyncedAt ? (
                  <s-text color="subdued">
                    Last synced {new Date(data.billingSyncedAt).toLocaleString()}
                  </s-text>
                ) : null}
                {data.isTest ? (
                  <s-banner tone="info" heading="Test billing mode">
                    Charges are created in Shopify test mode.
                  </s-banner>
                ) : null}
              </s-stack>
            </div>

            {subscription ? (
              <aside className={styles.metaPanel} aria-label="Plan period">
                <div>
                  <p className={styles.metaLabel}>Plan bought on</p>
                  <p className={styles.metaDate}>
                    {subscription.boughtOn
                      ? formatPlanDate(subscription.boughtOn)
                      : "—"}
                  </p>
                </div>
                <span
                  className={styles.validChip}
                  role="status"
                  aria-disabled="true"
                >
                  {subscription.validForLabel}
                </span>
              </aside>
            ) : null}
          </div>
        </s-box>

        <s-section heading="Plans">
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-box padding="base" border="base" borderRadius="large">
              <s-stack direction="block" gap="small">
                <s-text type="strong">Free — $0</s-text>
                <s-text color="subdued">
                  Up to {data.plans.free.publishedReviews} published reviews and{" "}
                  {data.plans.free.reviewRequests} request emails / month.
                </s-text>
                {!isPro ? <s-badge tone="success">Current plan</s-badge> : null}
              </s-stack>
            </s-box>
            <s-box padding="base" border="base" borderRadius="large">
              <s-stack direction="block" gap="small">
                <s-text type="strong">
                  Pro — ${data.plans.pro.price}/month
                </s-text>
                <s-text color="subdued">
                  {data.plans.pro.trialDays}-day trial. Up to{" "}
                  {data.plans.pro.publishedReviews.toLocaleString()} published
                  reviews and {data.plans.pro.reviewRequests.toLocaleString()}{" "}
                  request emails / month.
                </s-text>
                {isPro ? (
                  <div className={styles.planStatusRow}>
                    <s-badge tone="success">Current plan</s-badge>
                    {subscription?.expiresAt ? (
                      <span
                        className={styles.expiryChip}
                        role="status"
                        aria-disabled="true"
                      >
                        Expires {formatPlanDate(subscription.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </s-stack>
            </s-box>
          </s-grid>
        </s-section>

        <s-section heading="Manage plan">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="small">
              {!isPro ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="upgrade" />
                  <s-button
                    type="submit"
                    variant="primary"
                    disabled={navigation.state === "submitting"}
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
                  disabled={navigation.state === "submitting"}
                >
                  Refresh billing status
                </s-button>
              </Form>
            </s-stack>
            <s-text color="subdued">
              Upgrade opens Shopify checkout. Downgrade or cancel in Shopify Admin
              billing — existing published reviews stay visible.
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
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
