import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { reviewMediaService, toPublicMedia } from "../features/reviews/review-media.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { incentiveService } from "../features/incentives/incentive.service.server";
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

function publicSettings(settings: Awaited<ReturnType<typeof widgetSettingsService.getForShop>>) {
  return {
    widgetEnabled: settings.widgetEnabled,
    accentColor: settings.accentColor,
    primaryButtonColor: settings.primaryButtonColor,
    starColor: settings.starColor,
    borderRadius: settings.borderRadius,
    cardShadow: settings.cardShadow,
    layout: settings.layout,
    showCustomerName: settings.showCustomerName,
    showReviewDate: settings.showReviewDate,
    showProductImages: settings.showProductImages,
    showCustomerPhotos: settings.showCustomerPhotos,
    darkMode: settings.darkMode,
    showReviewForm: settings.showReviewForm,
    reviewsPerPage: settings.reviewsPerPage,
  };
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

  if (!settings.widgetEnabled) {
    return jsonResponse({
      items: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
      settings: publicSettings(settings),
    });
  }

  try {
    const result = await reviewService.listApprovedForStorefront(
      shop.id,
      {
        shopifyProductId: url.searchParams.get("productId"),
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") || settings.reviewsPerPage,
        sort: url.searchParams.get("sort") || undefined,
      },
      { includeMedia: settings.showCustomerPhotos },
    );

    return Response.json(
      {
        items: result.items.map((item) => ({
          ...item,
          media: settings.showCustomerPhotos ? item.media : [],
        })),
        pageInfo: result.pageInfo,
        settings: publicSettings(settings),
      },
      {
        status: 200,
        headers: {
          // Short private cache cuts repeated widget loads on the same page.
          "Cache-Control": "private, max-age=30",
        },
      },
    );
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
  const shop = await requireShopRecord(session.shop);
  const settings = await widgetSettingsService.getForShop(shop.id);

  if (!settings.widgetEnabled || !settings.showReviewForm) {
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
    let payload: unknown;

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      // Read the body once — multipart review submits reuse this FormData after
      // the uploadMedia branch (request.formData() cannot be called twice).
      const formData = await request.formData();
      const intent = String(formData.get("intent") ?? "");

      if (intent === "uploadMedia") {
        assertWithinRateLimit(`storefront-media:${shop.id}:${clientIp(request)}`);
        const file = formData.get("file");
        if (!(file instanceof File)) {
          throw new ValidationError("Invalid upload", ["File is required."]);
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        const media = await reviewMediaService.uploadForShop(shop.id, {
          bytes,
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
        });
        return jsonResponse({ media: toPublicMedia(media) }, 201);
      }

      payload = Object.fromEntries(
        [...formData.entries()].filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }

    const review = await reviewService.createStorefrontReview(
      shop.id,
      shop.plan,
      payload,
      {
        shopifyCustomerId,
        autoPublish: settings.autoPublishReviews,
      },
    );

    const incentive = await incentiveService.getPublicOfferForShop(shop.id);

    return jsonResponse({ review, incentive }, 201);
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
