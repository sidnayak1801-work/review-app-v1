export type ShopifyWebhookAuthenticate<T> = (
  request: Request,
) => Promise<T>;

export type ShopifyWebhookAuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export function webhookMethodNotAllowedResponse(): Response {
  return new Response("Method not allowed", { status: 405 });
}

export function webhookUnauthorizedResponse(): Response {
  return new Response("Unauthorized", { status: 401 });
}

/**
 * Runs Shopify webhook HMAC verification and returns a Response instead of
 * throwing, so React Router does not render the HTML document (200/500) for
 * App Store HMAC checks. Invalid or missing HMAC becomes 401; non-POST is 405.
 */
export async function authenticateShopifyWebhook<T>(
  authenticateWebhook: ShopifyWebhookAuthenticate<T>,
  request: Request,
): Promise<ShopifyWebhookAuthResult<T>> {
  try {
    const data = await authenticateWebhook(request);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Response && error.status === 405) {
      return { ok: false, response: webhookMethodNotAllowedResponse() };
    }

    return { ok: false, response: webhookUnauthorizedResponse() };
  }
}
