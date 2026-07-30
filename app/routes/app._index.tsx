import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  ShouldRevalidateFunctionArgs,
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
import { reviewRequestService } from "../features/review-requests/review-request.service.server";
import { reviewService } from "../features/reviews/review.service.server";
import { widgetSettingsService } from "../features/widget-settings/widget-settings.service.server";
import type { WidgetSettingsInput } from "../features/widget-settings/widget-settings.schema";
import { DomainError, ValidationError } from "../lib/domain-error";
import { requireShopRecord } from "../lib/shop-context.server";
import { authenticate } from "../shopify.server";
import { SaveSuccessModal } from "../components/save-success-modal";
import { useSaveSuccessModal } from "../components/use-save-success-modal";

/** Skip heavy Home reload after moderation fetchers; lists update optimistically. */
export function shouldRevalidate({
  formMethod,
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod?.toUpperCase() === "POST") {
    const intent = formData?.get("intent");
    if (intent === "update-status" || intent === "delete") {
      return false;
    }
  }
  return defaultShouldRevalidate;
}

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
  const { session } = await authenticate.admin(request);
  const shop = await requireShopRecord(session.shop);

  // Critical path only: 90d chart (365d loads lazily via /app/dashboard-chart).
  // Email MoM + activity feed deferred — not needed for first paint.
  const [
    latest,
    pending,
    queueCounts,
    settings,
    ratingSummary,
    series90d,
    emailsSentThisMonth,
  ] = await Promise.all([
    reviewService.listForShop(shop.id, { limit: 20 }),
    reviewService.listForShop(shop.id, { status: "PENDING", limit: 8 }),
    reviewService.getStatusCountsForShop(shop.id),
    widgetSettingsService.getForShop(shop.id),
    reviewService.getApprovedSummaryForShop(shop.id),
    reviewService.getShopReviewVolumeSeries(shop.id, 90),
    reviewRequestService.countSentInUtcMonth(shop.id),
  ]);

  const series30d = series90d.slice(-30);
  const series7d = series90d.slice(-7);

  const data = buildReviewXDashboardData({
    shopDomain: shop.shopDomain,
    queueCounts,
    averageRating: ratingSummary.averageRating,
    emailsSentThisMonth,
    emailsSentPreviousMonth: 0,
    ratingSummary,
    series7d,
    series30d,
    series90d,
    series365d: [],
    latestReviews: latest.items.map(mapReviewRow),
    pendingReviews: pending.items.map(mapReviewRow),
    activity: [],
    settings: toSettingsInput(settings),
    hasReviewRequestActivity: emailsSentThisMonth > 0,
  });

  return { data };
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

      return { ok: true as const, message: "Widget changes saved successfully!" };
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

  const widgetActionData =
    actionData &&
    (actionData.message === "Widget changes saved successfully!" ||
      (!actionData.ok && !actionData.message.startsWith("Review ")))
      ? actionData
      : undefined;

  const saveSuccess = useSaveSuccessModal(
    widgetActionData,
    isSubmitting,
    "Widget changes saved successfully!",
  );

  return (
    <>
      <DashboardPage
        data={data}
        actionMessage={
          widgetActionData && !widgetActionData.ok
            ? { ok: false, message: widgetActionData.message }
            : undefined
        }
        isSubmitting={isSubmitting}
      />
      <SaveSuccessModal
        open={saveSuccess.open}
        message={saveSuccess.message}
        onClose={saveSuccess.close}
      />
    </>
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
