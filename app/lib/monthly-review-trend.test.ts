import { describe, expect, it } from "vitest";

import {
  buildMonthlyRatingTrend,
  buildMonthlyReviewTrend,
} from "./monthly-review-trend";

describe("buildMonthlyReviewTrend", () => {
  it("fills contiguous months and buckets counts", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const points = buildMonthlyReviewTrend(
      [
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-10T00:00:00.000Z"),
        new Date("2026-05-20T00:00:00.000Z"),
        new Date("2025-01-01T00:00:00.000Z"),
      ],
      3,
      now,
    );

    expect(points).toHaveLength(3);
    expect(points.map((point) => point.monthKey)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(points.map((point) => point.count)).toEqual([1, 0, 2]);
  });
});

describe("buildMonthlyRatingTrend", () => {
  it("averages ratings per month", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const points = buildMonthlyRatingTrend(
      [
        { createdAt: new Date("2026-07-01T00:00:00.000Z"), rating: 5 },
        { createdAt: new Date("2026-07-10T00:00:00.000Z"), rating: 3 },
        { createdAt: new Date("2026-05-20T00:00:00.000Z"), rating: 4 },
      ],
      3,
      now,
    );

    expect(points.map((point) => point.averageRating)).toEqual([4, null, 4]);
  });
});
