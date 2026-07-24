import { describe, expect, it } from "vitest";

import {
  buildActivityFeed,
  deriveDashboardStats,
} from "./dashboard.activity";

describe("buildActivityFeed", () => {
  it("merges and sorts newest first", () => {
    const items = buildActivityFeed({
      reviews: [
        {
          id: "r1",
          status: "APPROVED",
          createdAt: "2026-07-20T10:00:00.000Z",
          publishedAt: "2026-07-21T10:00:00.000Z",
        },
        {
          id: "r2",
          status: "PENDING",
          createdAt: "2026-07-22T10:00:00.000Z",
        },
      ],
      imports: [
        {
          id: "i1",
          status: "COMPLETED",
          importedRows: 250,
          failedRows: 0,
          createdAt: "2026-07-19T10:00:00.000Z",
          updatedAt: "2026-07-19T11:00:00.000Z",
        },
      ],
      requests: [
        {
          id: "q1",
          status: "SENT",
          sentAt: "2026-07-23T09:00:00.000Z",
          createdAt: "2026-07-18T10:00:00.000Z",
        },
        {
          id: "q2",
          status: "SENT",
          sentAt: "2026-07-23T09:05:00.000Z",
          createdAt: "2026-07-18T10:00:00.000Z",
        },
      ],
      limit: 10,
    });

    expect(items[0]?.message).toMatch(/Sent/);
    expect(items.some((item) => item.message.includes("Imported 250"))).toBe(
      true,
    );
    expect(items.some((item) => item.message === "Published a review")).toBe(
      true,
    );
  });
});

describe("deriveDashboardStats", () => {
  it("computes totals and published percent", () => {
    expect(
      deriveDashboardStats({
        pending: 2,
        approved: 6,
        rejected: 2,
        averageRating: 4.5,
        widgetEnabled: true,
      }),
    ).toEqual({
      totalReviews: 10,
      pendingReviews: 2,
      averageRating: 4.5,
      publishedPercent: 60,
      widgetEnabled: true,
    });
  });
});
