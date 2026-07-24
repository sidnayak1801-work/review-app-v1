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
import {
  buildActivityFeed,
  deriveDashboardStats,
} from "../features/dashboard/dashboard.activity";
import { reviewImportService } from "../features/review-imports/review-import.service.server";
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { enrichReviewsWithProductTitles } from "../features/reviews/review-product-titles.server";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import type { WidgetSettingsInput } from "../features/widget-settings/widget-settings.schema";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  const [reviews, queueCounts, averageRating, settings, imports, requests] =
    await Promise.all([
      reviewService.listForShop(shop.id, { limit: 5 }),
      reviewService.getStatusCountsForShop(shop.id),
      reviewService.getAverageApprovedRatingForShop(shop.id),
      widgetSettingsService.getForShop(shop.id),
      reviewImportService.listRecentForShop(shop.id),
      reviewRequestService.listRecentForShop(shop.id),
    ]);

  const stats = deriveDashboardStats({
    pending: queueCounts.PENDING,
    approved: queueCounts.APPROVED,
    rejected: queueCounts.REJECTED,
    averageRating,
    widgetEnabled: settings.widgetEnabled,
  });

  const activity = buildActivityFeed({
    reviews: reviews.items,
    imports,
    requests,
    limit: 10,
  });

  const enrichedRecent = await enrichReviewsWithProductTitles(
    shop.id,
    admin,
    reviews.items,
  );

  return {
    stats,
    recentReviews: enrichedRecent.map((review) => ({
      id: review.id,
      authorName: review.authorName,
      rating: review.rating,
      shopifyProductId: review.shopifyProductId,
      productTitle: review.productTitle,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
    })),
    activity,
    settings: toSettingsInput(settings),
    hasReviewRequestActivity: requests.length > 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);
  const formData = await request.formData();

  try {
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
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "saveWidgetSettings";

  return (
    <DashboardPage
      stats={data.stats}
      recentReviews={data.recentReviews}
      activity={data.activity}
      settings={data.settings}
      hasReviewRequestActivity={data.hasReviewRequestActivity}
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
    <s-page heading="Review App">
      <s-banner heading="Dashboard unavailable" tone="critical">
        {message}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
