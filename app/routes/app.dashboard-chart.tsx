import type { LoaderFunctionArgs } from "react-router";

import { reviewService } from "../features/reviews/review.service.server";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/**
 * Lazy chart series for the Home dashboard (e.g. 365d after first paint).
 * Keep the main `/app` loader on a shorter window.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);
  const daysRaw = Number(url.searchParams.get("days") ?? "365");
  const days =
    daysRaw === 365 || daysRaw === 90 || daysRaw === 30 || daysRaw === 7
      ? daysRaw
      : 365;

  const series = await reviewService.getShopReviewVolumeSeries(shop.id, days);
  return { days, series };
};
