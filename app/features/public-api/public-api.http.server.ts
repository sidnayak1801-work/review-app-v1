import {
  DomainError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../../lib/domain-error";
import type { ApiTokenRecord } from "../../repositories/api-token.repository.server";
import type { ShopRecord } from "../../repositories/shop.repository.server";
import { apiTokenService } from "./api-token.service.server";
import {
  assertPublicApiRateLimit,
  getPublicApiRateLimitPolicy,
  publicApiRateLimiter,
  rateLimitHeaders,
  type RateLimitResult,
  type RateLimiter,
} from "./public-api.rate-limit.server";

export interface PublicApiContext {
  shop: ShopRecord;
  token: ApiTokenRecord;
  rateLimit: RateLimitResult;
}

export function publicApiJson(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function publicApiErrorResponse(
  error: unknown,
  rateLimit?: RateLimitResult,
): Response {
  const headers = rateLimit ? rateLimitHeaders(rateLimit) : undefined;

  if (error instanceof RateLimitError) {
    return publicApiJson(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      429,
      headers,
    );
  }

  if (error instanceof ValidationError) {
    return publicApiJson(
      {
        error: {
          code: error.code,
          message: error.message,
          issues: error.issues,
        },
      },
      400,
      headers,
    );
  }

  if (error instanceof NotFoundError) {
    return publicApiJson(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      404,
      headers,
    );
  }

  if (error instanceof DomainError) {
    const status = error.code === "UNAUTHORIZED" ? 401 : 400;
    return publicApiJson(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      status,
      headers,
    );
  }

  return publicApiJson(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    500,
    headers,
  );
}

/**
 * Authenticate Bearer token, apply rate limit, run handler.
 * Shared by REST now; GraphQL can call the same auth + limiter later.
 */
export async function handlePublicApi(
  request: Request,
  handler: (ctx: PublicApiContext) => Promise<Response>,
  options: { rateLimiter?: RateLimiter } = {},
): Promise<Response> {
  let rateLimit: RateLimitResult | undefined;

  try {
    const { shop, token } = await apiTokenService.authenticateBearer(
      request.headers.get("Authorization"),
    );

    const limiter = options.rateLimiter ?? publicApiRateLimiter;
    const policy = getPublicApiRateLimitPolicy(shop.plan);
    rateLimit = await assertPublicApiRateLimit(
      limiter,
      `public-api:${shop.id}:${token.id}`,
      policy,
    );

    const response = await handler({ shop, token, rateLimit });
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(rateLimitHeaders(rateLimit))) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return publicApiErrorResponse(error, rateLimit);
  }
}
