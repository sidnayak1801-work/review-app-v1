import type { LoaderFunctionArgs } from "react-router";

import {
  handlePublicApi,
  publicApiJson,
} from "../features/public-api/public-api.http.server";
import { reviewService } from "../features/reviews/review.service.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handlePublicApi(request, async ({ shop }) => {
    const url = new URL(request.url);
    const rating = await reviewService.getPublicApiRating(shop.id, {
      productId: url.searchParams.get("productId") ?? undefined,
    });
    return publicApiJson(rating);
  });
};
