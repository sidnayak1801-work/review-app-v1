import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import prisma from "./db.server";
import { PRO_PLAN } from "./features/billing/billing.constants";
import { shopService } from "./features/shops/shop.service.server";
import { getShopifyEnv } from "./lib/env.server";
import { logger } from "./services/logger.server";

const environment = getShopifyEnv();

const SHOP_INSTALL_QUERY = `#graphql
  query ShopInstallIdentity {
    shop {
      id
      email
      contactEmail
    }
  }
`;

interface ShopInstallResponse {
  data?: {
    shop?: {
      id?: string;
      email?: string | null;
      contactEmail?: string | null;
    };
  };
}

async function resolveShopInstallIdentity(
  admin: { graphql: (query: string) => Promise<Response> },
): Promise<{ shopifyShopId?: string; contactEmail?: string }> {
  try {
    const response = await admin.graphql(SHOP_INSTALL_QUERY);
    const payload = (await response.json()) as ShopInstallResponse;
    const shop = payload.data?.shop;
    const shopifyShopId =
      typeof shop?.id === "string" ? shop.id : undefined;
    const contactEmail = (shop?.email || shop?.contactEmail || "")
      .trim()
      .toLowerCase();

    return {
      ...(shopifyShopId ? { shopifyShopId } : {}),
      ...(contactEmail ? { contactEmail } : {}),
    };
  } catch (error) {
    logger.warn("Unable to resolve Shopify shop identity during install", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {};
  }
}

const shopify = shopifyApp({
  apiKey: environment.SHOPIFY_API_KEY,
  apiSecretKey: environment.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.July26,
  scopes: environment.SCOPES
    ? environment.SCOPES.split(",").filter(Boolean)
    : [],
  appUrl: environment.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [PRO_PLAN]: {
      lineItems: [
        {
          amount: 19,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      const identity = await resolveShopInstallIdentity(admin);

      await shopService.install({
        shopDomain: session.shop,
        ...(identity.shopifyShopId
          ? { shopifyShopId: identity.shopifyShopId }
          : {}),
        ...(identity.contactEmail
          ? { contactEmail: identity.contactEmail }
          : {}),
      });
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(environment.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [environment.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export { PRO_PLAN };
export const apiVersion = ApiVersion.July26;
export const shopifyApiKey = environment.SHOPIFY_API_KEY;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
