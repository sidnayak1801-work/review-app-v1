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
  useSubmit,
} from "react-router";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BillingReplacementBehavior,
  boundary,
} from "@shopify/shopify-app-react-router/server";

import {
  BILLING_STATUS_DOWNGRADE_SCHEDULED,
  FREE_MAX_PUBLISHED_REVIEWS,
  FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
  PRO_MONTHLY_PRICE_USD,
  PRO_TRIAL_DAYS,
} from "../features/billing/billing.constants";
import styles from "../features/billing/billing-page.module.css";
import { SaveSuccessModal } from "../components/save-success-modal";
import { billingEntitlementsService } from "../features/billing/billing.service.server";
import {
  billingSyncService,
  resolveBillingPresentation,
} from "../features/billing/billing-sync.service.server";
import { resolveChargeTestContext } from "../lib/billing-env.server";
import { buildEmbeddedAdminUrl } from "../lib/embedded-admin-url";
import { requireShopRecord } from "../lib/shop-context.server";
import { shopRepository } from "../repositories/shop.repository.server";
import { logger } from "../services/logger.server";
import { authenticate, PRO_PLAN, shopifyApiKey } from "../shopify.server";

type ModalElement = HTMLElement & {
  showOverlay?: () => void;
  hideOverlay?: () => void;
};

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

function proSuccessStorageKey(shopDomain: string, chargeId: string | null) {
  return `billing-pro-success:${shopDomain}:${chargeId ?? "return"}`;
}

function isFutureDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && value.getTime() > Date.now();
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shopRecord = await requireShopRecord(session.shop);

  // Shopify appends charge_id on the way back from the approval page for both
  // outcomes, so its presence marks the return trip rather than the outcome.
  const returnedFromCharge = new URL(request.url).searchParams.has("charge_id");
  const chargeId = returnedFromCharge
    ? new URL(request.url).searchParams.get("charge_id")
    : null;

  const { shop, proSubscription, presentation } =
    await billingSyncService.syncFromShopify({
      shopId: shopRecord.id,
      billing,
      awaitActivation: returnedFromCharge,
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

  const isPro = presentation.entitlementPlan === "PRO";
  const proAccessUntil =
    presentation.proAccessUntil?.toISOString() ??
    proSubscription?.currentPeriodEnd ??
    null;

  const subscription =
    isPro
      ? {
          boughtOn: proSubscription?.createdAt ?? null,
          expiresAt: proAccessUntil,
          validForLabel: "Valid for 1 month" as const,
        }
      : null;

  return {
    chargeDeclinedUpgrade:
      returnedFromCharge && presentation.billingPhase === "FREE",
    chargeDeclinedKeepPro:
      returnedFromCharge &&
      presentation.billingPhase === "PRO_DOWNGRADE_SCHEDULED",
    showProActivatedSuccess:
      returnedFromCharge && presentation.billingPhase === "PRO_ACTIVE",
    chargeId,
    shopDomain: session.shop,
    shopPlan: shop.plan,
    billingPhase: presentation.billingPhase,
    billingStatus: shop.billingStatus,
    billingSyncedAt: shop.billingSyncedAt?.toISOString() ?? null,
    proAccessUntil,
    subscription,
    usage,
    reviewRequestUsage,
    isTest: proSubscription?.test ?? false,
    plans: {
      free: {
        price: 0,
        publishedReviews: FREE_MAX_PUBLISHED_REVIEWS,
        reviewRequests: FREE_MAX_REVIEW_REQUESTS_PER_MONTH,
      },
      pro: {
        price: PRO_MONTHLY_PRICE_USD,
        trialDays: PRO_TRIAL_DAYS,
        publishedReviews: null as number | null,
        reviewRequests: null as number | null,
      },
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "downgrade") {
    const presentation = resolveBillingPresentation(shop);

    if (
      presentation.billingPhase === "PRO_DOWNGRADE_SCHEDULED" &&
      isFutureDate(shop.billingPeriodEnd)
    ) {
      return {
        ok: true as const,
        message: `Downgrade already scheduled. Pro access continues until ${formatPlanDate(shop.billingPeriodEnd.toISOString())}.`,
      };
    }

    try {
      const existing = await billing.check({ plans: [PRO_PLAN] });
      const pro = existing.appSubscriptions.find(
        (subscription) => subscription.name === PRO_PLAN,
      );

      if (!existing.hasActivePayment || !pro) {
        await billingSyncService.syncFromShopify({
          shopId: shop.id,
          billing,
        });
        return {
          ok: false as const,
          message: "No active Pro subscription found to downgrade.",
        };
      }

      const { isTest } = await resolveChargeTestContext(admin);

      logger.info("Billing downgrade initiated", {
        shop: session.shop,
        subscriptionId: pro.id,
        isTest,
      });

      await billing.cancel({
        subscriptionId: pro.id,
        prorate: false,
        isTest,
      });

      const periodEnd = pro.currentPeriodEnd
        ? new Date(pro.currentPeriodEnd)
        : null;

      if (!periodEnd || periodEnd.getTime() <= Date.now()) {
        await billingSyncService.syncFromShopify({
          shopId: shop.id,
          billing,
        });
        return {
          ok: true as const,
          message: "Your plan is now Free. Existing reviews and data remain intact.",
        };
      }

      const updated = await shopRepository.updateBillingState(shop.id, {
        plan: "PRO",
        billingStatus: BILLING_STATUS_DOWNGRADE_SCHEDULED,
        billingSyncedAt: new Date(),
        billingPeriodEnd: periodEnd,
      });

      if (!updated) {
        return {
          ok: false as const,
          message: "Could not save the scheduled downgrade. Please try again.",
        };
      }

      return {
        ok: true as const,
        message: `Downgrade scheduled. Pro access continues until ${formatPlanDate(periodEnd.toISOString())}.`,
      };
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      logger.warn("Billing downgrade failed", {
        shopId: shop.id,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        ok: false as const,
        message: billingErrorMessage(error),
      };
    }
  }

  if (intent === "keep_pro") {
    const presentation = resolveBillingPresentation(shop);

    if (presentation.billingPhase !== "PRO_DOWNGRADE_SCHEDULED") {
      return {
        ok: false as const,
        message: "There is no scheduled downgrade to cancel.",
      };
    }

    const returnUrl = buildEmbeddedAdminUrl({
      shopDomain: session.shop,
      apiKey: shopifyApiKey,
      path: "/app/billing",
    });

    try {
      const { isTest, partnerDevelopment } =
        await resolveChargeTestContext(admin);

      logger.info("Billing keep Pro initiated", {
        shop: session.shop,
        isTest,
        partnerDevelopment,
      });

      // trialDays: 0 — merchant already used Pro; do not grant a second trial.
      return await billing.request({
        plan: PRO_PLAN,
        isTest,
        trialDays: 0,
        returnUrl,
        replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
      });
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      logger.warn("Billing keep Pro request failed", {
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
    const presentation = resolveBillingPresentation(shop);

    if (presentation.billingPhase === "PRO_DOWNGRADE_SCHEDULED") {
      return {
        ok: false as const,
        message:
          "A downgrade is already scheduled. Use Keep Pro plan to stay on Pro.",
      };
    }

    const existing = await billing.check({ plans: [PRO_PLAN] });

    if (existing.hasActivePayment) {
      return {
        ok: false as const,
        message: "You already have an active Pro subscription.",
      };
    }

    // Must be the admin-hosted URL. Returning to the app origin drops the
    // shop/host params Shopify appends, leaving the merchant on an App Bridge
    // bootstrap page served with HTTP 200 instead of the billing page.
    const returnUrl = buildEmbeddedAdminUrl({
      shopDomain: session.shop,
      apiKey: shopifyApiKey,
      path: "/app/billing",
    });

    try {
      const { isTest, partnerDevelopment } =
        await resolveChargeTestContext(admin);

      logger.info("Billing upgrade initiated", {
        shop: session.shop,
        isTest,
        partnerDevelopment,
      });

      // Throws a redirect Response when Shopify approval URL is ready.
      return await billing.request({
        plan: PRO_PLAN,
        isTest,
        trialDays: PRO_TRIAL_DAYS,
        returnUrl,
        replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
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

function DowngradeConfirmModal({
  open,
  effectiveDateLabel,
  onClose,
  submitting,
  onConfirm,
}: {
  open: boolean;
  effectiveDateLabel: string;
  onClose: () => void;
  submitting: boolean;
  onConfirm: () => void;
}) {
  const reactId = useId();
  const modalId = `downgrade-confirm-${reactId.replace(/:/g, "")}`;
  const modalRef = useRef<ModalElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    if (open) {
      modal.showOverlay?.();
    } else {
      modal.hideOverlay?.();
    }
  }, [open]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const handleHide = () => {
      onClose();
    };
    modal.addEventListener("hide", handleHide);
    return () => modal.removeEventListener("hide", handleHide);
  }, [onClose]);

  return (
    <s-modal
      id={modalId}
      heading="Downgrade to Free?"
      size="small"
      ref={modalRef as never}
    >
      <s-stack direction="block" gap="base">
        <s-text>
          Your Pro plan will stop renewing and will remain active until{" "}
          {effectiveDateLabel}. After that date, your account will switch to the
          Free plan.
        </s-text>
        <s-text color="subdued">
          Your existing reviews and data will remain intact.
        </s-text>
      </s-stack>
      <s-button slot="secondary-actions" onClick={onClose} disabled={submitting}>
        Cancel
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={submitting}
        onClick={onConfirm}
      >
        Downgrade to Free
      </s-button>
    </s-modal>
  );
}

export default function BillingRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const submitting = navigation.state === "submitting";
  const isPro = data.shopPlan === "PRO";
  const isScheduled = data.billingPhase === "PRO_DOWNGRADE_SCHEDULED";
  const isActivePro = data.billingPhase === "PRO_ACTIVE";
  const subscription = data.subscription;
  const [proSuccessOpen, setProSuccessOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);

  const confirmDowngrade = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "downgrade");
    submit(formData, { method: "post" });
  }, [submit]);

  useEffect(() => {
    if (!data.showProActivatedSuccess) {
      return;
    }

    const key = proSuccessStorageKey(data.shopDomain, data.chargeId);

    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "1");
    setProSuccessOpen(true);
  }, [data.showProActivatedSuccess, data.chargeId, data.shopDomain]);

  useEffect(() => {
    if (actionData?.ok && navigation.state === "idle") {
      setDowngradeOpen(false);
    }
  }, [actionData, navigation.state]);

  const closeProSuccess = useCallback(() => {
    setProSuccessOpen(false);
  }, []);

  const closeDowngrade = useCallback(() => {
    setDowngradeOpen(false);
  }, []);

  const effectiveDateLabel = data.proAccessUntil
    ? formatPlanDate(data.proAccessUntil)
    : "the end of your current billing period";

  const statusBadgeLabel = isScheduled
    ? "Downgrade scheduled"
    : (data.billingStatus ?? "Active");

  return (
    <>
      <SaveSuccessModal
        open={proSuccessOpen}
        heading="Pro activated"
        message="Pro version activated successfully."
        onClose={closeProSuccess}
      />
      <DowngradeConfirmModal
        open={downgradeOpen}
        effectiveDateLabel={effectiveDateLabel}
        onClose={closeDowngrade}
        submitting={submitting}
        onConfirm={confirmDowngrade}
      />
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

        {data.chargeDeclinedUpgrade ? (
          <s-banner heading="Charge not approved" tone="info">
            You are still on the Free plan. Choose Upgrade to Pro to review the
            charge again.
          </s-banner>
        ) : null}

        {data.chargeDeclinedKeepPro ? (
          <s-banner heading="Charge not approved" tone="info">
            You did not approve the new Pro subscription. Your downgrade is
            still scheduled and Pro access continues until {effectiveDateLabel}.
            Choose Keep Pro plan to open Shopify&apos;s approval page again.
          </s-banner>
        ) : null}

        {isScheduled && !data.chargeDeclinedKeepPro ? (
          <s-banner heading="Downgrade scheduled" tone="info">
            Pro access continues until {effectiveDateLabel}. After that date
            your account switches to Free. Existing reviews and data stay
            intact. Keep Pro plan opens Shopify&apos;s approval page for a new
            Pro subscription (no second trial).
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
                    {statusBadgeLabel}
                  </s-badge>
                </s-stack>
                <s-text>
                  Published reviews: {data.usage.used}
                  {data.usage.limit !== null
                    ? ` / ${data.usage.limit}`
                    : " · unlimited"}
                </s-text>
                <s-text>
                  Review-request emails this month: {data.reviewRequestUsage.used}
                  {data.reviewRequestUsage.limit !== null
                    ? ` / ${data.reviewRequestUsage.limit}`
                    : " · unlimited"}
                </s-text>
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
                  <p className={styles.metaLabel}>
                    {isScheduled ? "Pro access until" : "Plan bought on"}
                  </p>
                  <p className={styles.metaDate}>
                    {isScheduled
                      ? effectiveDateLabel
                      : subscription.boughtOn
                        ? formatPlanDate(subscription.boughtOn)
                        : "—"}
                  </p>
                </div>
                {!isScheduled ? (
                  <span
                    className={styles.validChip}
                    role="status"
                    aria-disabled="true"
                  >
                    {subscription.validForLabel}
                  </span>
                ) : null}
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
                  {data.plans.pro.trialDays}-day trial. Unlimited published
                  reviews and unlimited request emails / month.
                </s-text>
                {isPro ? (
                  <div className={styles.planStatusRow}>
                    <s-badge tone="success">Current plan</s-badge>
                    {data.proAccessUntil ? (
                      <span
                        className={styles.expiryChip}
                        role="status"
                        aria-disabled="true"
                      >
                        {isScheduled ? "Until" : "Expires"}{" "}
                        {formatPlanDate(data.proAccessUntil)}
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
                    disabled={submitting}
                  >
                    Upgrade to Pro
                  </s-button>
                </Form>
              ) : null}
              {isActivePro ? (
                <s-button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setDowngradeOpen(true)}
                >
                  Downgrade to Free
                </s-button>
              ) : null}
              {isScheduled ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="keep_pro" />
                  <s-button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                  >
                    Keep Pro plan
                  </s-button>
                </Form>
              ) : null}
            </s-stack>
            <s-text color="subdued">
              Upgrade and Keep Pro both open Shopify&apos;s approval page.
              Downgrade stops Pro renewal while keeping Pro access until the end
              of the paid period. Existing published reviews stay visible on
              Free.
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // `authenticate.admin` signals bounce, exit-iframe, and reauth by throwing a
  // Response whose body is an App Bridge script tag. React Router delivers that
  // as an ErrorResponse, and only `boundary.error` re-renders the body so the
  // script runs. Rendering our own message instead strands the merchant on an
  // HTTP 200 page and the redirect back from charge approval never completes.
  if (isRouteErrorResponse(error)) {
    return boundary.error(error);
  }

  return (
    <s-page heading="Billing">
      <s-banner heading="Unavailable" tone="critical">
        {error instanceof Error ? error.message : "Billing could not be loaded."}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
