import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handlePublicApi,
  publicApiJson,
} from "../features/public-api/public-api.http.server";
import { reviewService } from "../features/reviews/review.service.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handlePublicApi(request, async ({ shop }) => {
    const url = new URL(request.url);
    const result = await reviewService.listApprovedForPublicApi(shop.id, {
      productId: url.searchParams.get("productId") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    return publicApiJson(result);
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return publicApiJson(
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET and POST are supported.",
        },
      },
      405,
    );
  }

  return handlePublicApi(request, async ({ shop }) => {
    const body: unknown = await request.json();
    const review = await reviewService.createPublicApiReview(shop.id, body);
    return publicApiJson({ review }, 201);
  });
};
