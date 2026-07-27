export interface VolumeSeriesPoint {
  dateKey: string;
  label: string;
  count: number;
}

export interface VolumeDayCount {
  dateKey: string;
  count: number;
}

/**
 * Build contiguous UTC day buckets for a rolling window from raw timestamps.
 */
export function buildDailyReviewVolumeSeries(
  createdAts: Date[],
  days: number,
  now = new Date(),
): VolumeSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const createdAt of createdAts) {
    const key = createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return fillDailyVolumeBuckets(counts, days, now);
}

/**
 * Build contiguous UTC day buckets from pre-aggregated day counts (SQL GROUP BY).
 */
export function buildDailyReviewVolumeSeriesFromCounts(
  dayCounts: VolumeDayCount[],
  days: number,
  now = new Date(),
): VolumeSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const row of dayCounts) {
    counts.set(row.dateKey, (counts.get(row.dateKey) ?? 0) + row.count);
  }
  return fillDailyVolumeBuckets(counts, days, now);
}

function fillDailyVolumeBuckets(
  counts: Map<string, number>,
  days: number,
  now: Date,
): VolumeSeriesPoint[] {
  const dayCount = Math.min(Math.max(days, 1), 366);
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (dayCount - 1),
    ),
  );

  const points: VolumeSeriesPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i),
    );
    const dateKey = date.toISOString().slice(0, 10);
    points.push({
      dateKey,
      label: date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: counts.get(dateKey) ?? 0,
    });
  }

  return points;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
