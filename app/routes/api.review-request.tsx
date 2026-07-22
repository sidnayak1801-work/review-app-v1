import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { DomainError, RateLimitError, ValidationError } from "../lib/domain-error";
import { assertWithinRateLimit } from "../lib/rate-limit.server";
import { clientIp } from "../lib/request-ip.server";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return jsonResponse(
      { error: { code: "VALIDATION_ERROR", message: "Missing review token." } },
      400,
    );
  }

  try {
    assertWithinRateLimit(`review-request-get:${clientIp(request)}`);
    const context = await reviewRequestService.getSubmissionContext(token);

    return jsonResponse({
      shopifyProductId: context.shopifyProductId,
      ready: true,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        429,
      );
    }

    if (error instanceof DomainError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        404,
      );
    }

    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    assertWithinRateLimit(`review-request-post:${clientIp(request)}`);

    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());

    const result = await reviewRequestService.submitReviewFromToken({
      rawInput: payload,
    });

    return jsonResponse(
      {
        ok: true,
        reviewId: result.reviewId,
        message: "Thanks! Your review was submitted for moderation.",
      },
      201,
    );
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
