export interface ActivityFeedItem {
  id: string;
  message: string;
  createdAt: string;
}

interface ActivitySourceReview {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date | string;
  publishedAt?: Date | string | null;
}

interface ActivitySourceImport {
  id: string;
  status: string;
  importedRows: number;
  failedRows: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ActivitySourceRequest {
  id: string;
  status: string;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toTime(value: Date | string): number {
  return new Date(value).getTime();
}

export function buildActivityFeed(input: {
  reviews: ActivitySourceReview[];
  imports: ActivitySourceImport[];
  requests: ActivitySourceRequest[];
  limit?: number;
}): ActivityFeedItem[] {
  const limit = input.limit ?? 10;
  const items: ActivityFeedItem[] = [];

  for (const review of input.reviews) {
    if (review.status === "APPROVED") {
      items.push({
        id: `review-approved-${review.id}`,
        message: "Published a review",
        createdAt: toIso(review.publishedAt ?? review.createdAt),
      });
    } else if (review.status === "REJECTED") {
      items.push({
        id: `review-rejected-${review.id}`,
        message: "Rejected a review",
        createdAt: toIso(review.createdAt),
      });
    } else {
      items.push({
        id: `review-pending-${review.id}`,
        message: "New pending review",
        createdAt: toIso(review.createdAt),
      });
    }
  }

  for (const job of input.imports) {
    if (job.status === "COMPLETED") {
      items.push({
        id: `import-${job.id}`,
        message: `Imported ${job.importedRows} reviews`,
        createdAt: toIso(job.updatedAt),
      });
    } else if (job.status === "FAILED") {
      items.push({
        id: `import-failed-${job.id}`,
        message: `Import failed (${job.failedRows} rows)`,
        createdAt: toIso(job.updatedAt),
      });
    }
  }

  const sentByOrder = new Map<string, { count: number; at: string }>();
  for (const request of input.requests) {
    if (!request.sentAt || (request.status !== "SENT" && request.status !== "COMPLETED")) {
      continue;
    }
    const key = toIso(request.sentAt).slice(0, 16);
    const existing = sentByOrder.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      sentByOrder.set(key, { count: 1, at: toIso(request.sentAt) });
    }
  }

  for (const [key, value] of sentByOrder) {
    items.push({
      id: `requests-sent-${key}`,
      message:
        value.count === 1
          ? "Sent 1 review request"
          : `Sent ${value.count} review requests`,
      createdAt: value.at,
    });
  }

  return items
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, limit);
}

export function deriveDashboardStats(input: {
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number | null;
  widgetEnabled: boolean;
}) {
  const total = input.pending + input.approved + input.rejected;
  const publishedPercent =
    total === 0 ? 0 : Math.round((input.approved / total) * 100);

  return {
    totalReviews: total,
    pendingReviews: input.pending,
    averageRating: input.averageRating,
    publishedPercent,
    widgetEnabled: input.widgetEnabled,
  };
}
