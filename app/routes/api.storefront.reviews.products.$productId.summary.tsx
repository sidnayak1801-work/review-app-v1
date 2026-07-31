import type { LoaderFunctionArgs } from "react-router";

import { reviewService } from "../features/reviews/review.service.server";
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

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return jsonResponse(
      { error: { code: "UNAUTHORIZED", message: "Shop not found." } },
      401,
    );
  }

  const shop = await requireShopRecord(session.shop);
  const productId = params.productId?.trim() ?? "";

  if (!productId) {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid product",
          issues: ["Product id is required"],
        },
      },
      400,
    );
  }

  try {
    assertWithinRateLimit(
      `storefront-summary:${shop.id}:${clientIp(request)}`,
    );

    const summary = await reviewService.getStorefrontProductSummary(
      shop.id,
      productId,
    );

    return Response.json(summary, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    });
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
