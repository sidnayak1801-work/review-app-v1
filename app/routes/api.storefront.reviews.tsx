import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { reviewService } from "../features/reviews/review.service.server";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import {
  DomainError,
  RateLimitError,
  ValidationError,
} from "../lib/domain-error";
import { assertWithinRateLimit } from "../lib/rate-limit.server";
import { clientIp } from "../lib/request-ip.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return jsonResponse(
      { error: { code: "UNAUTHORIZED", message: "Shop not found." } },
      401,
    );
  }

  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);
  const settings = await widgetSettingsService.getForShop(shop.id);

  try {
    const result = await reviewService.listApprovedForStorefront(shop.id, {
      shopifyProductId: url.searchParams.get("productId"),
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || settings.reviewsPerPage,
    });

    return jsonResponse({
      items: result.items,
      pageInfo: result.pageInfo,
      settings: {
        accentColor: settings.accentColor,
        showReviewForm: settings.showReviewForm,
        reviewsPerPage: settings.reviewsPerPage,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse(
        {
          error: {
            code: error.code,
            message: error.message,
            issues: error.issues,
          },
        },
        400,
      );
    }

    if (error instanceof DomainError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        400,
      );
    }

    throw error;
  }
};

function loggedInCustomerIdFromRequest(request: Request): string | null {
  const value = new URL(request.url).searchParams.get("logged_in_customer_id");
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return jsonResponse(
      { error: { code: "UNAUTHORIZED", message: "Shop not found." } },
      401,
    );
  }

  const shopifyCustomerId = loggedInCustomerIdFromRequest(request);
  if (!shopifyCustomerId) {
    return jsonResponse(
      {
        error: {
          code: "AUTH_REQUIRED",
          message: "Sign in to leave a review.",
        },
      },
      401,
    );
  }

  const shop = await requireShopRecord(session.shop);
  const settings = await widgetSettingsService.getForShop(shop.id);

  if (!settings.showReviewForm) {
    return jsonResponse(
      {
        error: {
          code: "FORM_DISABLED",
          message: "Review submission is disabled.",
        },
      },
      403,
    );
  }

  try {
    assertWithinRateLimit(`storefront-review:${shop.id}:${clientIp(request)}`);

    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());

    const review = await reviewService.createStorefrontReview(
      shop.id,
      payload,
      { shopifyCustomerId },
    );

    return jsonResponse({ review }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        429,
      );
    }

    if (error instanceof ValidationError) {
      return jsonResponse(
        {
          error: {
            code: error.code,
            message: error.message,
            issues: error.issues,
          },
        },
        400,
      );
    }

    if (error instanceof DomainError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        400,
      );
    }

    throw error;
  }
};
