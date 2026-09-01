import type {
  ShopifyAppSubscription,
  ShopifyBillingClient,
} from "../features/billing/billing-sync.service.server";

const ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query AppActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        createdAt
        currentPeriodEnd
        trialDays
      }
    }
  }
`;

interface ActiveSubscriptionsResponse {
  data?: {
    currentAppInstallation?: {
      activeSubscriptions?: Array<{
        id?: string;
        name?: string;
        createdAt?: string | null;
        currentPeriodEnd?: string | null;
        trialDays?: number | null;
        test?: boolean | null;
      } | null> | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
}

type AdminGraphqlClient = {
  graphql: (query: string) => Promise<Response>;
};

function toAppSubscription(node: {
  id?: string;
  name?: string;
  createdAt?: string | null;
  currentPeriodEnd?: string | null;
  trialDays?: number | null;
  test?: boolean | null;
}): ShopifyAppSubscription | null {
  if (!node.id || !node.name) {
    return null;
  }

  return {
    id: node.id,
    name: node.name,
    ...(node.createdAt ? { createdAt: node.createdAt } : {}),
    currentPeriodEnd: node.currentPeriodEnd ?? null,
    ...(typeof node.trialDays === "number" ? { trialDays: node.trialDays } : {}),
    test: node.test === true,
  };
}

/**
 * Read the shop's active app subscriptions straight from Shopify.
 *
 * Used where no request-scoped `billing` helper exists — notably the
 * `app_subscriptions/update` webhook, which must verify state with Shopify
 * rather than trust the delivered payload. Webhook delivery is not ordered, so
 * a late `PENDING` or a stale `DECLINED` would otherwise downgrade a merchant
 * who has already been approved.
 *
 * Mirrors the SDK's `billing.check`: `activeSubscriptions` only ever returns
 * active records, and test subscriptions are deliberately not filtered out
 * because a development store can hold nothing else.
 *
 * Throws on transport or GraphQL errors so the caller can fail loudly and let
 * Shopify retry, rather than writing an unverified plan.
 */
export function createBillingClient(
  admin: AdminGraphqlClient,
): ShopifyBillingClient {
  return {
    async check({ plans }) {
      const response = await admin.graphql(ACTIVE_SUBSCRIPTIONS_QUERY);
      const payload = (await response.json()) as ActiveSubscriptionsResponse;

      if (payload.errors?.length) {
        throw new Error(
          `Shopify billing check failed: ${payload.errors[0]?.message ?? "unknown error"}`,
        );
      }

      const nodes =
        payload.data?.currentAppInstallation?.activeSubscriptions ?? [];

      const appSubscriptions = nodes
        .flatMap((node) => (node ? [node] : []))
        .filter((node) => Boolean(node.name) && plans.includes(node.name as "Pro"))
        .flatMap((node) => {
          const subscription = toAppSubscription(node);
          return subscription ? [subscription] : [];
        });

      return {
        hasActivePayment: appSubscriptions.length > 0,
        appSubscriptions,
      };
    },
  };
}
