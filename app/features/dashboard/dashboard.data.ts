import { percentChange } from "../../lib/daily-review-volume";
import type { VolumeSeriesPoint } from "../../lib/daily-review-volume";
import type { ActivityFeedItem } from "./dashboard.activity";
import type {
  ChartRange,
  DashboardKpis,
  DashboardReviewRow,
  KpiTrend,
  ReviewXDashboardData,
} from "./components/reviewx/types";
import type { WidgetSettingsInput } from "../widget-settings/widget-settings.schema";

function trendFromChange(percent: number | null, label: string): KpiTrend {
  if (percent == null) {
    return { percent: null, direction: "flat", label };
  }
  if (percent > 0) return { percent, direction: "up", label };
  if (percent < 0) return { percent, direction: "down", label };
  return { percent: 0, direction: "flat", label };
}

function sumCounts(points: VolumeSeriesPoint[]): number {
  return points.reduce((sum, point) => sum + point.count, 0);
}

function sparkFromSeries(points: VolumeSeriesPoint[], buckets = 8): number[] {
  if (points.length === 0) return Array.from({ length: buckets }, () => 0);
  const size = Math.max(1, Math.floor(points.length / buckets));
  const values: number[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const slice = points.slice(i * size, i === buckets - 1 ? undefined : (i + 1) * size);
    values.push(slice.reduce((sum, p) => sum + p.count, 0));
  }
  return values;
}

export function buildReviewXDashboardData(input: {
  shopDomain: string;
  queueCounts: { PENDING: number; APPROVED: number; REJECTED: number };
  averageRating: number | null;
  emailsSentThisMonth: number;
  /** Previous UTC month sent count for trend */
  emailsSentPreviousMonth: number;
  ratingSummary: {
    approvedCount: number;
    averageRating: number | null;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  series30d: VolumeSeriesPoint[];
  series7d: VolumeSeriesPoint[];
  series90d: VolumeSeriesPoint[];
  series365d: VolumeSeriesPoint[];
  latestReviews: DashboardReviewRow[];
  pendingReviews: DashboardReviewRow[];
  activity: ActivityFeedItem[];
  settings: WidgetSettingsInput;
  hasReviewRequestActivity: boolean;
}): ReviewXDashboardData {
  const totalReviews =
    input.queueCounts.PENDING +
    input.queueCounts.APPROVED +
    input.queueCounts.REJECTED;

  const last15 = input.series30d.slice(-15);
  const prev15 = input.series30d.slice(0, 15);
  const reviewsChange = percentChange(sumCounts(last15), sumCounts(prev15));

  // MOCK: rating / pending MoM deltas until historical snapshots exist.
  const ratingTrend = trendFromChange(
    input.averageRating == null ? null : 3,
    "vs last month",
  );
  const pendingTrend = trendFromChange(
    input.queueCounts.PENDING === 0 ? 0 : -8,
    "vs last month",
  );

  const kpis: DashboardKpis = {
    totalReviews,
    averageRating: input.averageRating,
    pendingReviews: input.queueCounts.PENDING,
    emailsSent: input.emailsSentThisMonth,
    trends: {
      reviews: trendFromChange(reviewsChange, "vs prior 15 days"),
      rating: ratingTrend,
      pending: pendingTrend,
      emails: trendFromChange(
        percentChange(
          input.emailsSentThisMonth,
          input.emailsSentPreviousMonth,
        ),
        "vs last month",
      ),
    },
  };

  const chartSeriesByRange: Record<ChartRange, VolumeSeriesPoint[]> = {
    "7d": input.series7d,
    "30d": input.series30d,
    "90d": input.series90d,
    "365d": input.series365d,
  };

  const monthPoints = input.series30d;
  const reviewsThisMonth = sumCounts(monthPoints);

  // MOCK spark values for open/conversion until analytics backends exist.
  const mockOpen = [42, 44, 41, 48, 47, 51, 49, 53];
  const mockConversion = [1.8, 2.0, 1.9, 2.2, 2.1, 2.4, 2.3, 2.5];

  const shopName = input.shopDomain.replace(/\.myshopify\.com$/i, "");

  return {
    shopDomain: input.shopDomain,
    shopName: shopName || input.shopDomain,
    kpis,
    chartSeriesByRange,
    ratingSummary: input.ratingSummary,
    latestReviews: input.latestReviews,
    pendingReviews: input.pendingReviews,
    activity: input.activity,
    analytics: {
      averageRating: input.averageRating,
      reviewsThisMonth,
      emailOpenRate: 48,
      conversionRate: 2.3,
      sparks: {
        rating: sparkFromSeries(input.series30d).map((count, index) =>
          count === 0 ? 0 : Math.min(5, 3 + (index % 3) * 0.3),
        ),
        volume: sparkFromSeries(input.series30d),
        openRate: mockOpen,
        conversion: mockConversion,
      },
    },
    settings: input.settings,
    hasReviewRequestActivity: input.hasReviewRequestActivity,
  };
}
