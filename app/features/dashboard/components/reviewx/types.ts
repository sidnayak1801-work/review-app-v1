import type { ActivityFeedItem } from "../../dashboard.activity";
import type { WidgetSettingsInput } from "../../../widget-settings/widget-settings.schema";
import type { VolumeSeriesPoint } from "../../../../lib/daily-review-volume";

export type ChartRange = "7d" | "30d" | "90d" | "365d";

export interface DashboardReviewRow {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  shopifyProductId: string;
  productTitle?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface KpiTrend {
  percent: number | null;
  direction: "up" | "down" | "flat";
  label: string;
}

export interface DashboardKpis {
  totalReviews: number;
  averageRating: number | null;
  pendingReviews: number;
  emailsSent: number;
  trends: {
    reviews: KpiTrend;
    rating: KpiTrend;
    pending: KpiTrend;
    emails: KpiTrend;
  };
}

export interface RatingDistributionData {
  approvedCount: number;
  averageRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface AnalyticsSnapshotData {
  averageRating: number | null;
  reviewsThisMonth: number;
  /** Mock until email analytics exist */
  emailOpenRate: number;
  /** Mock until conversion tracking exists */
  conversionRate: number;
  sparks: {
    rating: number[];
    volume: number[];
    openRate: number[];
    conversion: number[];
  };
}

export interface ReviewXDashboardData {
  shopDomain: string;
  shopName: string;
  kpis: DashboardKpis;
  chartSeriesByRange: Record<ChartRange, VolumeSeriesPoint[]>;
  ratingSummary: RatingDistributionData;
  latestReviews: DashboardReviewRow[];
  pendingReviews: DashboardReviewRow[];
  activity: ActivityFeedItem[];
  analytics: AnalyticsSnapshotData;
  settings: WidgetSettingsInput;
  hasReviewRequestActivity: boolean;
}
