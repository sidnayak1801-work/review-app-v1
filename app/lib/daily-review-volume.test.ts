import { describe, expect, it } from "vitest";

import { buildDailyReviewVolumeSeries, buildDailyReviewVolumeSeriesFromCounts, percentChange } from "./daily-review-volume";

describe("buildDailyReviewVolumeSeries", () => {
  it("fills contiguous day buckets", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const points = buildDailyReviewVolumeSeries(
      [
        new Date("2026-07-09T10:00:00.000Z"),
        new Date("2026-07-09T18:00:00.000Z"),
        new Date("2026-07-10T01:00:00.000Z"),
      ],
      3,
      now,
    );

    expect(points).toHaveLength(3);
    expect(points[0].count).toBe(0);
    expect(points[1].count).toBe(2);
    expect(points[2].count).toBe(1);
  });
});

describe("buildDailyReviewVolumeSeriesFromCounts", () => {
  it("fills empty days from SQL aggregates", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const points = buildDailyReviewVolumeSeriesFromCounts(
      [
        { dateKey: "2026-07-09", count: 2 },
        { dateKey: "2026-07-10", count: 1 },
      ],
      3,
      now,
    );

    expect(points.map((p) => ({ dateKey: p.dateKey, count: p.count }))).toEqual(
      [
        { dateKey: "2026-07-08", count: 0 },
        { dateKey: "2026-07-09", count: 2 },
        { dateKey: "2026-07-10", count: 1 },
      ],
    );
  });
});

describe("percentChange", () => {
  it("computes percentage deltas", () => {
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
  });
});
