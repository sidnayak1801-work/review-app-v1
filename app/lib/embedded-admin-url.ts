const MYSHOPIFY_SUFFIX = ".myshopify.com";

/**
 * Build the admin-hosted URL for a page inside the embedded app.
 *
 * Shopify billing return URLs must point at `admin.shopify.com`, not at the app
 * origin. Shopify performs a top-level navigation to the return URL after the
 * merchant approves or declines a charge, and only the admin-hosted URL causes
 * Shopify to supply the `shop`, `host`, and `embedded` params the app needs to
 * authenticate. An app-origin return URL strands the merchant on an App Bridge
 * bootstrap page served with HTTP 200, and the route loader never runs.
 *
 * Mirrors `buildEmbeddedAppUrl` in `@shopify/shopify-api`, which derives the
 * same URL from the shop domain when no `host` param is available.
 */
export function buildEmbeddedAdminUrl(input: {
  shopDomain: string;
  apiKey: string;
  path?: string;
}): string {
  const storeHandle = input.shopDomain.endsWith(MYSHOPIFY_SUFFIX)
    ? input.shopDomain.slice(0, -MYSHOPIFY_SUFFIX.length)
    : input.shopDomain;

  const appRoot = `https://admin.shopify.com/store/${storeHandle}/apps/${input.apiKey}`;

  if (!input.path) {
    return appRoot;
  }

  const suffix = input.path.startsWith("/") ? input.path : `/${input.path}`;

  return `${appRoot}${suffix}`;
}
