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

import { ReviewsPage } from "../features/reviews/components/reviews-page";
import { reviewService } from "../features/reviews/review.service.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const url = new URL(request.url);

  const result = await reviewService.listForShop(shop.id, {
    status: url.searchParams.get("status") || undefined,
    shopifyProductId: url.searchParams.get("productId") || undefined,
    cursor: url.searchParams.get("cursor") || undefined,
    limit: 20,
  });

  return {
    shopDomain: shop.shopDomain,
    reviews: result.items.map((review) => ({
      ...review,
      publishedAt: review.publishedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    })),
    pageInfo: result.pageInfo,
    filters: {
      status: url.searchParams.get("status") ?? "",
      productId: url.searchParams.get("productId") ?? "",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create") {
      const review = await reviewService.createMerchantReview(
        shop.id,
        shop.plan,
        {
          shopifyProductId: formData.get("shopifyProductId"),
          rating: formData.get("rating"),
          title: formData.get("title"),
          body: formData.get("body"),
          authorName: formData.get("authorName"),
          authorEmail: formData.get("authorEmail"),
          status: formData.get("status") || "APPROVED",
          verifiedPurchase: formData.get("verifiedPurchase") === "on",
        },
      );

      return { ok: true as const, message: `Review ${review.id} created.` };
    }

    if (intent === "update-status") {
      const reviewId = String(formData.get("reviewId") ?? "");
      await reviewService.updateForShop(shop.id, shop.plan, reviewId, {
        status: formData.get("status"),
      });
      return { ok: true as const, message: "Review status updated." };
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
