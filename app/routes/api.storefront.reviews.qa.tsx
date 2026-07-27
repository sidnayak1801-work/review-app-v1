import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { questionService } from "../features/questions/question.service.server";
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

  try {
    const result = await questionService.listPublicForStorefront(shop.id, {
      shopifyProductId: url.searchParams.get("productId"),
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || 3,
    });

    return Response.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return jsonResponse(
      { error: { code: "UNAUTHORIZED", message: "Shop not found." } },
      401,
    );
  }

  const shop = await requireShopRecord(session.shop);
  const ip = clientIp(request);

  try {
    assertWithinRateLimit(`storefront-qa:${shop.id}:${ip}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(
        { error: { code: error.code, message: error.message } },
        429,
      );
    }
    throw error;
  }

  const contentType = request.headers.get("content-type") || "";
  let rawInput: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    rawInput = (await request.json()) as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    rawInput = Object.fromEntries(formData.entries());
  }

  try {
    const created = await questionService.createStorefrontQuestion(
      shop.id,
      shop.shopDomain,
      rawInput,
    );

    return jsonResponse({ ok: true, item: created }, 201);
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
