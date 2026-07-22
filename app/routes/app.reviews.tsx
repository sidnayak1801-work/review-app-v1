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
import { reviewStatusSchema } from "../features/reviews/review.schema";
import { DomainError, ValidationError } from "../lib/domain-error";
import { isBillingTestMode } from "../lib/billing-env.server";
import {
  requireShopWithBillingSync,
} from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

function resolveQueueStatus(
  value: string | null,
): "PENDING" | "APPROVED" | "REJECTED" {
  const parsed = reviewStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "PENDING";
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
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
  });
  const url = new URL(request.url);
  const queueStatus = resolveQueueStatus(url.searchParams.get("status"));

  const [result, queueCounts, publishedReviewUsage] = await Promise.all([
    reviewService.listForShop(shop.id, {
      status: queueStatus,
      shopifyProductId: url.searchParams.get("productId") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: 20,
    }),
    reviewService.getStatusCountsForShop(shop.id),
    billingEntitlementsService.getPublishedReviewUsage({
      shopId: shop.id,
      shopPlan: shop.plan,
    }),
  ]);

  return {
    shopDomain: shop.shopDomain,
    shopPlan: shop.plan,
    reviews: result.items.map((review) => ({
      ...review,
      publishedAt: review.publishedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    })),
    pageInfo: result.pageInfo,
    queueCounts,
    publishedReviewUsage,
    filters: {
      status: queueStatus,
      productId: url.searchParams.get("productId") ?? "",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
    forceSync: true,
  });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "update-status") {
      const reviewId = String(formData.get("reviewId") ?? "");
      await reviewService.updateForShop(shop.id, shop.plan, reviewId, {
        status: formData.get("status"),
      });
      return { ok: true as const, message: "Review status updated." };
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
      return { ok: true as const, message: "Review deleted." };
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
      isSubmitting={navigation.state !== "idle"}
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
