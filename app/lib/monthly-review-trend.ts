export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  count: number;
}

export interface MonthlyRatingTrendPoint {
  monthKey: string;
  label: string;
  averageRating: number | null;
}

/** Build contiguous UTC month buckets from review createdAt timestamps. */
export function buildMonthlyReviewTrend(
  createdAts: Date[],
  months = 12,
  now = new Date(),
): MonthlyTrendPoint[] {
  const monthCount = Math.min(Math.max(months, 1), 24);
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthCount - 1), 1),
  );

  const countsByMonth = new Map<string, number>();
  for (const createdAt of createdAts) {
    if (createdAt < start) {
      continue;
    }
    const key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }

  const points: MonthlyTrendPoint[] = [];
  for (let i = 0; i < monthCount; i += 1) {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
    );
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    points.push({
      monthKey,
      label: date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      count: countsByMonth.get(monthKey) ?? 0,
    });
  }

  return points;
}

/** Monthly average ratings for approved reviews (null when a month has none). */
export function buildMonthlyRatingTrend(
  entries: Array<{ createdAt: Date; rating: number }>,
  months = 12,
  now = new Date(),
): MonthlyRatingTrendPoint[] {
  const monthCount = Math.min(Math.max(months, 1), 24);
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthCount - 1), 1),
  );

  const sumsByMonth = new Map<string, { sum: number; count: number }>();
  for (const entry of entries) {
    if (entry.createdAt < start) {
      continue;
    }
    const key = `${entry.createdAt.getUTCFullYear()}-${String(entry.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const current = sumsByMonth.get(key) ?? { sum: 0, count: 0 };
    current.sum += entry.rating;
    current.count += 1;
    sumsByMonth.set(key, current);
  }

  const points: MonthlyRatingTrendPoint[] = [];
  for (let i = 0; i < monthCount; i += 1) {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
    );
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = sumsByMonth.get(monthKey);
    points.push({
      monthKey,
      label: date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      averageRating:
        bucket && bucket.count > 0
          ? Math.round((bucket.sum / bucket.count) * 10) / 10
          : null,
    });
  }

  return points;
}
