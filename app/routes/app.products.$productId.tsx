import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  ShouldRevalidateFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  useSearchParams,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { ProductDetailPage } from "../features/products/components/product-detail-page";
import { productInsightsService } from "../features/products/product-insights.service.server";
import { reviewMediaService } from "../features/reviews/review-media.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { isBillingTestMode } from "../lib/billing-env.server";
import {
  requireShopWithBillingSync,
} from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

/** Skip heavy loader re-fetch after moderation; UI patches from fetcher results. */
export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod === "POST") {
    return false;
  }
  return defaultShouldRevalidate;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
  });

  const productId = params.productId ?? "";
  const url = new URL(request.url);

  try {
    const detailQuery = await productInsightsService.parseDetailQuery({
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: 20,
    });

    const detail = await productInsightsService.getDetailForShop(
      shop.id,
      admin,
      productId,
    );

    const [reviewsResult, publishedReviewUsage] = await Promise.all([
      reviewService.listForShop(shop.id, {
        shopifyProductId: detail.shopifyProductId,
        cursor: detailQuery.cursor,
        limit: detailQuery.limit,
      }),
      billingEntitlementsService.getPublishedReviewUsage({
        shopId: shop.id,
        shopPlan: shop.plan,
      }),
    ]);

    const mediaByReview = await reviewMediaService.listGroupedForReviews(
      shop.id,
      reviewsResult.items.map((item) => item.id),
    );

    return {
      detail,
      publishedReviewUsage,
      reviews: reviewsResult.items.map((review) => ({
        id: review.id,
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: review.status,
        featured: review.featured,
        merchantReply: review.merchantReply,
        createdAt: review.createdAt.toISOString(),
        media: mediaByReview.get(review.id) ?? [],
      })),
      pageInfo: reviewsResult.pageInfo,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DomainError) {
      throw new Response(error.message, { status: 400 });
    }
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  // Cached plan only — avoid Shopify billing.round-trip on every click.
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
    forceSync: false,
  });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");

  try {
    if (intent === "update-status") {
      const status = String(formData.get("status") ?? "");
      await reviewService.updateForShop(shop.id, shop.plan, reviewId, {
        status,
      });
      return {
        ok: true as const,
        message: "Review status updated.",
        patch: { reviewId, status },
      };
    }

    if (intent === "delete") {
      await reviewService.deleteForShop(shop.id, reviewId);
      return {
        ok: true as const,
        message: "Review deleted.",
        patch: { reviewId, deleted: true as const },
      };
    }

    if (intent === "set-featured") {
      const featuredRaw = String(formData.get("featured") ?? "");
      const featured = featuredRaw === "true";
      await reviewService.setFeaturedForShop(shop.id, {
        reviewId,
        featured,
      });
      return {
        ok: true as const,
        message: "Featured status updated.",
        patch: { reviewId, featured },
      };
    }

    if (intent === "set-reply") {
      const reply = String(formData.get("merchantReply") ?? "").trim();
      await reviewService.setMerchantReplyForShop(shop.id, {
        reviewId,
        merchantReply: reply,
      });
      return {
        ok: true as const,
        message: "Reply saved.",
        patch: {
          reviewId,
          merchantReply: reply.length > 0 ? reply : null,
        },
      };
    }

    return { ok: false as const, message: "Unknown action." };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DomainError) {
      return { ok: false as const, message: error.message };
    }
    throw error;
  }
};

export default function ProductDetailRoute() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const nextHref =
    data.pageInfo.hasNextPage && data.pageInfo.nextCursor
      ? `?${new URLSearchParams({
          ...Object.fromEntries(searchParams),
          cursor: data.pageInfo.nextCursor,
        }).toString()}`
      : null;

  const atPublishedLimit =
    data.publishedReviewUsage.limit != null &&
    data.publishedReviewUsage.used >= data.publishedReviewUsage.limit;

  return (
    <ProductDetailPage
      title={data.detail.title}
      numericId={data.detail.numericId}
      shopifyAdminHref={data.detail.shopifyAdminHref}
      shopify={data.detail.shopify}
      stats={data.detail.stats}
      volumeTrend={data.detail.volumeTrend}
      ratingTrend={data.detail.ratingTrend}
      insights={data.detail.insights}
      reviews={data.reviews}
      nextHref={nextHref}
      reviewsListHref={`/app/reviews?productId=${encodeURIComponent(data.detail.shopifyProductId)}`}
      hasAnyReviews={data.detail.hasAnyReviews}
      atPublishedLimit={atPublishedLimit}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText || "Product insights could not be loaded."
    : "Product insights could not be loaded.";

  return (
    <s-page heading="Product">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
