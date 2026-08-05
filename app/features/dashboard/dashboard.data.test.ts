import { describe, expect, it } from "vitest";

import { buildReviewTrixDashboardData } from "./dashboard.data";

describe("buildReviewTrixDashboardData", () => {
  it("assembles KPIs and chart ranges from shop metrics", () => {
    const series30d = Array.from({ length: 30 }, (_, index) => ({
      dateKey: `2026-07-${String(index + 1).padStart(2, "0")}`,
      label: String(index + 1),
      count: index < 15 ? 1 : 2,
    }));

    const data = buildReviewTrixDashboardData({
      shopDomain: "acme.myshopify.com",
      queueCounts: { PENDING: 2, APPROVED: 10, REJECTED: 1 },
      averageRating: 4.6,
      emailsSentThisMonth: 20,
      emailsSentPreviousMonth: 10,
      ratingSummary: {
        approvedCount: 10,
        averageRating: 4.6,
        ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 7 },
      },
      series7d: series30d.slice(-7),
      series30d,
      series90d: series30d,
      series365d: series30d,
      latestReviews: [],
      pendingReviews: [],
      activity: [],
      settings: {
        widgetEnabled: true,
        accentColor: "#111111",
        primaryButtonColor: "#111111",
        starColor: "#22c55e",
        borderRadius: 8,
        cardShadow: true,
        layout: "STACKED",
        showCustomerName: true,
        showReviewDate: true,
        showProductImages: false,
        showCustomerPhotos: true,
        autoPublishReviews: false,
        darkMode: false,
        showReviewForm: true,
        reviewsPerPage: 5,
      },
      hasReviewRequestActivity: true,
    });

    expect(data.shopName).toBe("acme");
    expect(data.kpis.totalReviews).toBe(13);
    expect(data.kpis.emailsSent).toBe(20);
    expect(data.kpis.trends.emails.direction).toBe("up");
    expect(data.chartSeriesByRange["30d"]).toHaveLength(30);
    expect(data.analytics.emailOpenRate).toBe(48);
  });
});
