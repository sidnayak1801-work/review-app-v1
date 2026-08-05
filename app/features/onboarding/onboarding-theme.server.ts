import { getShopifyEnv } from "../../lib/env.server";
import { ONBOARDING_WIDGET_OPTIONS } from "./onboarding-widgets";

export { ONBOARDING_WIDGET_OPTIONS };

/** Theme App Extension folder / handle used in deep links. */
export const REVIEW_WIDGET_EXTENSION_HANDLE = "review-widget";

export function themeAppEmbedEditorUrl(shopDomain: string): string {
  const apiKey = getShopifyEnv().SHOPIFY_API_KEY;
  const host = shopDomain.replace(/^https?:\/\//, "");
  return `https://${host}/admin/themes/current/editor?context=apps&activateAppId=${encodeURIComponent(`${apiKey}/${REVIEW_WIDGET_EXTENSION_HANDLE}`)}`;
}

export function themeAddBlockEditorUrl(
  shopDomain: string,
  blockHandle: string,
): string {
  const apiKey = getShopifyEnv().SHOPIFY_API_KEY;
  const host = shopDomain.replace(/^https?:\/\//, "");
  const addAppBlockId = `${apiKey}/${REVIEW_WIDGET_EXTENSION_HANDLE}/${blockHandle}`;
  return `https://${host}/admin/themes/current/editor?template=product&addAppBlockId=${encodeURIComponent(addAppBlockId)}&target=mainSection`;
}

export function storefrontUrl(shopDomain: string): string {
  const host = shopDomain.replace(/^https?:\/\//, "");
  return `https://${host}`;
}
