import { logger } from "./logger.server";

const SHOP_PLAN_QUERY = `#graphql
  query ShopBillingContext {
    shop {
      plan {
        partnerDevelopment
      }
    }
  }
`;

interface ShopPlanResponse {
  data?: {
    shop?: {
      plan?: {
        partnerDevelopment?: boolean | null;
      } | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
}

type AdminGraphqlClient = {
  graphql: (query: string) => Promise<Response>;
};

/**
 * Development stores cannot process real transactions, so app charges created
 * against them must be test charges. Shopify app reviewers evaluate paid plans
 * on a development store, which is why charge creation cannot key off
 * `NODE_ENV` alone.
 *
 * Returns `null` when the store type cannot be determined, so callers can pick
 * their own fallback rather than silently treating the shop as a live store.
 */
export async function isDevelopmentStore(
  admin: AdminGraphqlClient,
): Promise<boolean | null> {
  try {
    const response = await admin.graphql(SHOP_PLAN_QUERY);
    const payload = (await response.json()) as ShopPlanResponse;

    if (payload.errors?.length) {
      logger.warn("Shop plan GraphQL returned errors", {
        errorCount: payload.errors.length,
        message: payload.errors[0]?.message ?? "unknown",
      });
      return null;
    }

    const partnerDevelopment = payload.data?.shop?.plan?.partnerDevelopment;

    return typeof partnerDevelopment === "boolean" ? partnerDevelopment : null;
  } catch (error) {
    // A thrown Response is App Bridge control flow. Swallowing it here would
    // fall back to NODE_ENV, and in production that means creating a live
    // charge on a development store, which can never activate.
    if (error instanceof Response) {
      throw error;
    }

    logger.warn("Unable to resolve Shopify store type", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}
