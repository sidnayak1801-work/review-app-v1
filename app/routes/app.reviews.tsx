import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
  useSearchParams,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { billingEntitlementsService } from "../features/billing/billing.service.server";
import { ReviewsPage } from "../features/reviews/components/reviews-page";
import type { BulkUpdateReviewStatusResult } from "../features/reviews/review.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { reviewMediaService } from "../features/reviews/review-media.service.server";
import { reviewStatusSchema } from "../features/reviews/review.schema";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

function resolveQueueFilter(
  value: string | null,
): "ALL" | "PENDING" | "APPROVED" | "REJECTED" {
  if (!value || value === "ALL") {
    return "ALL";
  }
  const parsed = reviewStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "ALL";
}

function buildBulkUpdateMessage(
  result: BulkUpdateReviewStatusResult,
  status: "APPROVED" | "REJECTED",
): string {
  const actionLabel = status === "APPROVED" ? "Approved" : "Rejected";
  const parts: string[] = [];

  if (result.updatedCount > 0) {
    parts.push(
      `${actionLabel} ${result.updatedCount} review${result.updatedCount === 1 ? "" : "s"}.`,
    );
  }

  if (result.skippedCount > 0) {
    parts.push(
      `Skipped ${result.skippedCount} review${result.skippedCount === 1 ? "" : "s"} already in the target state.`,
    );
  }

  if (result.failures.length > 0) {
    const firstReason = result.failures[0]?.reason ?? "Could not update review.";
    parts.push(
      `${result.failures.length} review${result.failures.length === 1 ? "" : "s"} could not be ${status === "APPROVED" ? "approved" : "rejected"}: ${firstReason}`,
    );
  }

  if (parts.length === 0) {
    return "No reviews were updated.";
  }

  return parts.join(" ");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);
  const queueFilter = resolveQueueFilter(url.searchParams.get("status"));
  const searchQuery = url.searchParams.get("q")?.trim() || undefined;

  const [result, queueCounts, publishedReviewUsage] = await Promise.all([
    reviewService.listForShop(shop.id, {
      status: queueFilter === "ALL" ? undefined : queueFilter,
      shopifyProductId: url.searchParams.get("productId") || undefined,
      q: searchQuery,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: 20,
    }),
    reviewService.getStatusCountsForShop(shop.id),
    billingEntitlementsService.getPublishedReviewUsage({
      shopId: shop.id,
      shopPlan: shop.plan,
    }),
  ]);

  // Media only — do not block list on Admin GraphQL product-title enrichment.
  const mediaByReview = await reviewMediaService.listGroupedForReviews(
    shop.id,
    result.items.map((item) => item.id),
  );

  return {
    shopDomain: shop.shopDomain,
    shopPlan: shop.plan,
    reviews: result.items.map((review) => ({
      ...review,
      publishedAt: review.publishedAt?.toISOString() ?? null,
      merchantReplyAt: review.merchantReplyAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      media: mediaByReview.get(review.id) ?? [],
    })),
    pageInfo: result.pageInfo,
    queueCounts,
    publishedReviewUsage,
    filters: {
      status: queueFilter,
      productId: url.searchParams.get("productId") ?? "",
      q: searchQuery ?? "",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "update-status") {
      const reviewId = String(formData.get("reviewId") ?? "");
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

    if (intent === "bulk-update-status") {
      const status = String(formData.get("status") ?? "");
      const parsedStatus = reviewStatusSchema.safeParse(status);

      if (
        !parsedStatus.success ||
        (parsedStatus.data !== "APPROVED" && parsedStatus.data !== "REJECTED")
      ) {
        return {
          ok: false as const,
          message: "Bulk updates support approve or reject actions only.",
        };
      }

      const result = await reviewService.bulkUpdateStatusForShop(
        shop.id,
        shop.plan,
        {
          reviewIds: formData.getAll("reviewIds").map(String),
          status: parsedStatus.data,
        },
      );

      const message = buildBulkUpdateMessage(result, parsedStatus.data);

      return {
        ok: result.updatedCount > 0,
        message,
      };
    }

    if (intent === "delete") {
      const reviewId = String(formData.get("reviewId") ?? "");
      await reviewService.deleteForShop(shop.id, reviewId);
      return {
        ok: true as const,
        message: "Review deleted.",
        patch: { reviewId, deleted: true as const },
      };
    }

    if (intent === "set-featured") {
      const reviewId = String(formData.get("reviewId") ?? "");
      const featured = String(formData.get("featured") ?? "") === "true";
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
      const reviewId = String(formData.get("reviewId") ?? "");
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
    if (error instanceof ValidationError) {
      return {
        ok: false as const,
        message: error.message,
        issues: error.issues,
      };
    }

    if (error instanceof DomainError) {
      return { ok: false as const, message: error.message };
    }

    throw error;
  }
};

export default function ReviewsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  return (
    <ReviewsPage
      reviews={data.reviews}
      pageInfo={data.pageInfo}
      filters={data.filters}
      queueCounts={data.queueCounts}
      publishedReviewUsage={data.publishedReviewUsage}
      shopPlan={data.shopPlan}
      actionData={actionData}
      isSubmitting={navigation.state === "submitting"}
      nextHref={
        data.pageInfo.hasNextPage && data.pageInfo.nextCursor
          ? `?${new URLSearchParams({
              ...Object.fromEntries(searchParams),
              cursor: data.pageInfo.nextCursor,
            }).toString()}`
          : null
      }
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Reviews could not be loaded.";

  return (
    <s-page heading="Reviews">
      <s-banner heading="Unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
