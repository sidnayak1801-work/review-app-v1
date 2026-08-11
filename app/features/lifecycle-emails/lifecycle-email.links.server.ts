import { getShopifyEnv } from "../../lib/env.server";

/** Store handle from `example.myshopify.com` → `example`. */
export function shopDomainToStoreHandle(shopDomain: string): string {
  return shopDomain.trim().toLowerCase().replace(/\.myshopify\.com$/, "");
}

function adminAppBaseUrl(shopDomain: string): string {
  const handle = shopDomainToStoreHandle(shopDomain);
  const apiKey = getShopifyEnv().SHOPIFY_API_KEY;
  return `https://admin.shopify.com/store/${handle}/apps/${apiKey}`;
}

/** Embedded Admin deep link to ReviewTrix onboarding. */
export function toOnboardingDeepLink(shopDomain: string): string {
  return `${adminAppBaseUrl(shopDomain)}/app/onboarding`;
}

/** Embedded Admin deep link to ReviewTrix home. */
export function toAppHomeDeepLink(shopDomain: string): string {
  return `${adminAppBaseUrl(shopDomain)}/app`;
}

export const SUPPORT_EMAIL = "support@reviewtrix.algorithmtrix.com";

export function toSupportMailto(shopDomain: string): string {
  const subject = encodeURIComponent(`ReviewTrix support — ${shopDomain}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
}
