import type { LoaderFunctionArgs } from "react-router";

import {
  handlePublicApi,
  publicApiJson,
} from "../features/public-api/public-api.http.server";
import { reviewService } from "../features/reviews/review.service.server";

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs) => {
  return handlePublicApi(request, async ({ shop }) => {
    const url = new URL(request.url);
    const productId = params.productId;
    if (!productId) {
      return publicApiJson(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Product ID is required.",
          },
        },
        400,
      );
    }

    const result = await reviewService.listApprovedForPublicApi(shop.id, {
      productId,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    return publicApiJson(result);
  });
};
