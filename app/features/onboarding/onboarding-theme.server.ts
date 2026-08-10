import { getShopifyEnv } from "../../lib/env.server";
import { ONBOARDING_WIDGET_OPTIONS } from "./onboarding-widgets";

export { ONBOARDING_WIDGET_OPTIONS };

/** Theme App Extension folder / handle used in deep links. */
export const REVIEW_WIDGET_EXTENSION_HANDLE = "review-widget";

/** Numeric theme id from a Shopify OnlineStoreTheme GID (or raw digits). */
export function themeNumericId(themeGidOrId: string): string | null {
  const fromGid = themeGidOrId.match(/OnlineStoreTheme\/(\d+)/);
  if (fromGid?.[1]) {
    return fromGid[1];
  }
  if (/^\d+$/.test(themeGidOrId)) {
    return themeGidOrId;
  }
  return null;
}

function themeEditorBasePath(themeId?: string | null): string {
  const numeric = themeId ? themeNumericId(themeId) : null;
  return numeric ? `themes/${numeric}` : "themes/current";
}

export function themeAppEmbedEditorUrl(
  shopDomain: string,
  themeId?: string | null,
): string {
  const apiKey = getShopifyEnv().SHOPIFY_API_KEY;
  const host = shopDomain.replace(/^https?:\/\//, "");
  return `https://${host}/admin/${themeEditorBasePath(themeId)}/editor?context=apps&activateAppId=${encodeURIComponent(`${apiKey}/${REVIEW_WIDGET_EXTENSION_HANDLE}`)}`;
}

export function themeAddBlockEditorUrl(
  shopDomain: string,
  blockHandle: string,
  themeId?: string | null,
): string {
  const apiKey = getShopifyEnv().SHOPIFY_API_KEY;
  const host = shopDomain.replace(/^https?:\/\//, "");
  const addAppBlockId = `${apiKey}/${REVIEW_WIDGET_EXTENSION_HANDLE}/${blockHandle}`;
  return `https://${host}/admin/${themeEditorBasePath(themeId)}/editor?template=product&addAppBlockId=${encodeURIComponent(addAppBlockId)}&target=mainSection`;
}

export function storefrontUrl(shopDomain: string): string {
  const host = shopDomain.replace(/^https?:\/\//, "");
  return `https://${host}`;
}
