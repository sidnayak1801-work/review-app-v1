import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { DashboardPage } from "../features/dashboard/components/dashboard-page";
import { buildReviewXDashboardData } from "../features/dashboard/dashboard.data";
import {
  buildActivityFeed,
} from "../features/dashboard/dashboard.activity";
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import type { WidgetSettingsInput } from "../features/widget-settings/widget-settings.schema";
import { isBillingTestMode } from "../lib/billing-env.server";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopWithBillingSync } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";

function toSettingsInput(settings: {
  widgetEnabled: boolean;
  accentColor: string;
  primaryButtonColor: string;
  starColor: string;
  borderRadius: number;
  cardShadow: boolean;
  layout: WidgetSettingsInput["layout"];
  showCustomerName: boolean;
  showReviewDate: boolean;
  showProductImages: boolean;
  showCustomerPhotos: boolean;
  autoPublishReviews: boolean;
  darkMode: boolean;
  showReviewForm: boolean;
  reviewsPerPage: number;
}): WidgetSettingsInput {
  return {
    widgetEnabled: settings.widgetEnabled,
    accentColor: settings.accentColor,
    primaryButtonColor: settings.primaryButtonColor,
    starColor: settings.starColor,
    borderRadius: settings.borderRadius,
    cardShadow: settings.cardShadow,
    layout: settings.layout,
    showCustomerName: settings.showCustomerName,
    showReviewDate: settings.showReviewDate,
    showProductImages: settings.showProductImages,
    showCustomerPhotos: settings.showCustomerPhotos,
    autoPublishReviews: settings.autoPublishReviews,
    darkMode: settings.darkMode,
    showReviewForm: settings.showReviewForm,
    reviewsPerPage: settings.reviewsPerPage,
  };
}

function mapReviewRow(review: {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  shopifyProductId: string;
  productTitle: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
}) {
  return {
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    body: review.body,
    shopifyProductId: review.shopifyProductId,
    productTitle: review.productTitle,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
    forceSync: false,
  });

  const previousMonthRef = new Date();
  previousMonthRef.setUTCMonth(previousMonthRef.getUTCMonth() - 1);

  const [
    latest,
    pending,
    queueCounts,
    settings,
    ratingSummary,
    series365d,
    emailsSentThisMonth,
    emailsSentPreviousMonth,
    recentRequests,
  ] = await Promise.all([
    reviewService.listForShop(shop.id, { limit: 20 }),
    reviewService.listForShop(shop.id, { status: "PENDING", limit: 8 }),
    reviewService.getStatusCountsForShop(shop.id),
    widgetSettingsService.getForShop(shop.id),
    reviewService.getApprovedSummaryForShop(shop.id),
    reviewService.getShopReviewVolumeSeries(shop.id, 365),
    reviewRequestService.countSentInUtcMonth(shop.id),
    reviewRequestService.countSentInUtcMonth(shop.id, previousMonthRef),
    reviewRequestService.listRecentForShop(shop.id, 10),
  ]);

  const series90d = series365d.slice(-90);
  const series30d = series365d.slice(-30);
  const series7d = series365d.slice(-7);

  const activity = buildActivityFeed({
    reviews: latest.items,
    imports: [],
    requests: recentRequests,
    limit: 10,
  });

  const data = buildReviewXDashboardData({
    shopDomain: shop.shopDomain,
    queueCounts,
    averageRating: ratingSummary.averageRating,
    emailsSentThisMonth,
    emailsSentPreviousMonth,
    ratingSummary,
    series7d,
    series30d,
    series90d,
    series365d,
    latestReviews: latest.items.map(mapReviewRow),
    pendingReviews: pending.items.map(mapReviewRow),
    activity,
    settings: toSettingsInput(settings),
    hasReviewRequestActivity: recentRequests.length > 0,
  });

  return { data };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = await requireShopWithBillingSync({
    shopDomain: session.shop,
    billing,
    isTest: isBillingTestMode(),
    forceSync: false,
  });
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
        message:
          status === "APPROVED"
            ? "Review approved."
            : status === "REJECTED"
              ? "Review hidden."
              : "Review status updated.",
      };
    }

    if (intent === "delete") {
      const reviewId = String(formData.get("reviewId") ?? "");
      await reviewService.deleteForShop(shop.id, reviewId);
      return { ok: true as const, message: "Review deleted." };
    }

    if (intent === "saveWidgetSettings" || intent === "") {
      await widgetSettingsService.updateForShop(shop.id, {
        widgetEnabled: formData.get("widgetEnabled"),
        accentColor: formData.get("accentColor"),
        primaryButtonColor: formData.get("primaryButtonColor"),
        starColor: formData.get("starColor"),
        borderRadius: formData.get("borderRadius"),
        cardShadow: formData.get("cardShadow"),
        layout: formData.get("layout"),
        showCustomerName: formData.get("showCustomerName"),
        showReviewDate: formData.get("showReviewDate"),
        showProductImages: formData.get("showProductImages"),
        showCustomerPhotos: formData.get("showCustomerPhotos"),
        autoPublishReviews: formData.get("autoPublishReviews"),
        darkMode: formData.get("darkMode"),
        showReviewForm: formData.get("showReviewForm"),
        reviewsPerPage: formData.get("reviewsPerPage"),
      });

      return { ok: true as const, message: "Widget settings saved." };
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

export default function AppIndex() {
  const { data } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "saveWidgetSettings";

  return (
    <DashboardPage
      data={data}
      actionMessage={
        actionData
          ? { ok: actionData.ok, message: actionData.message }
          : undefined
      }
      isSubmitting={isSubmitting}
    />
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "The dashboard could not be loaded. Please try again.";

  return (
    <s-page heading="Dashboard">
      <s-banner heading="Dashboard unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
