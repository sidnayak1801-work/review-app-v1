import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import prisma from "../db.server";
import {
  decodeReviewCursor,
  encodeReviewCursor,
} from "../lib/shopify-ids";
import {
  decodeStorefrontReviewCursor,
  encodeStorefrontReviewCursor,
} from "../lib/storefront-review-cursor.server";
import type { StorefrontReviewSort } from "../features/reviews/review.schema";
import {
  buildDailyReviewVolumeSeriesFromCounts,
  type VolumeSeriesPoint,
} from "../lib/daily-review-volume";
import { buildMonthlyRatingTrend, buildMonthlyReviewTrend } from "../lib/monthly-review-trend";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewSource = "STOREFRONT" | "MERCHANT" | "IMPORT" | "API";

export interface ReviewRecord {
  id: string;
  shopId: string;
  shopifyProductId: string;
  productTitle: string | null;
  shopifyCustomerId: string | null;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorEmail: string | null;
  status: ReviewStatus;
  source: ReviewSource;
  verifiedPurchase: boolean;
  featured: boolean;
  hasImage: boolean;
  hasVideo: boolean;
  merchantReply: string | null;
  merchantReplyAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRecordInput {
  shopId: string;
  shopifyProductId: string;
  productTitle?: string | null;
  shopifyCustomerId?: string;
  rating: number;
  title?: string;
  body: string;
  authorName: string;
  authorEmail?: string;
  status: ReviewStatus;
  source: ReviewSource;
  verifiedPurchase?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  publishedAt?: Date | null;
}

export interface ListStorefrontReviewsInput {
  shopId: string;
  shopifyProductId: string;
  sort: StorefrontReviewSort;
  cursor?: string;
  limit: number;
}

export interface UpdateReviewRecordInput {
  rating?: number;
  title?: string | null;
  productTitle?: string | null;
  body?: string;
  authorName?: string;
  authorEmail?: string | null;
  status?: ReviewStatus;
  verifiedPurchase?: boolean;
  featured?: boolean;
  merchantReply?: string | null;
  merchantReplyAt?: Date | null;
  publishedAt?: Date | null;
}

export interface ListReviewsInput {
  shopId: string;
  status?: ReviewStatus;
  shopifyProductId?: string;
  /** Case-insensitive match on author, title, body, or product title. */
  query?: string;
  cursor?: string;
  limit: number;
}

export interface ListReviewsResult {
  items: ReviewRecord[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface ReviewStatusCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
}

export interface ReviewCustomerMatchInput {
  email: string | null;
  customerIds: string[];
}

export interface ListProductsForShopInput {
  shopId: string;
  query?: string;
  cursor?: string;
  limit: number;
}

export interface ProductReviewSummary {
  shopifyProductId: string;
  productTitle: string | null;
  totalReviews: number;
  pendingReviews: number;
  averageApprovedRating: number | null;
}

export interface ListProductsForShopResult {
  items: ProductReviewSummary[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface ProductReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  reviewsWithMedia: number;
  averageApprovedRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ProductReviewTrendPoint {
  monthKey: string;
  label: string;
  count: number;
}

export interface ProductRatingTrendPoint {
  monthKey: string;
  label: string;
  averageRating: number | null;
}

export interface ApprovedReviewSummary {
  approvedCount: number;
  averageRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewRepository {
  create(input: CreateReviewRecordInput): Promise<ReviewRecord>;
  findByIdForShop(
    shopId: string,
    reviewId: string,
  ): Promise<ReviewRecord | null>;
  findByIdsForShop(shopId: string, reviewIds: string[]): Promise<ReviewRecord[]>;
  findForCustomerPrivacy(
    shopId: string,
    match: ReviewCustomerMatchInput,
  ): Promise<ReviewRecord[]>;
  list(input: ListReviewsInput): Promise<ListReviewsResult>;
  listForStorefront(input: ListStorefrontReviewsInput): Promise<ListReviewsResult>;
  refreshMediaFlags(shopId: string, reviewId: string): Promise<void>;
  listProductsForShop(
    input: ListProductsForShopInput,
  ): Promise<ListProductsForShopResult>;
  getProductStatsForShop(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductReviewStats>;
  getProductReviewTrendForShop(
    shopId: string,
    shopifyProductId: string,
    months?: number,
  ): Promise<ProductReviewTrendPoint[]>;
  getProductRatingTrendForShop(
    shopId: string,
    shopifyProductId: string,
    months?: number,
  ): Promise<ProductRatingTrendPoint[]>;
  countApprovedForShop(shopId: string): Promise<number>;
  countByStatusForShop(shopId: string): Promise<ReviewStatusCounts>;
  averageApprovedRatingForShop(shopId: string): Promise<number | null>;
  getApprovedSummaryForShop(
    shopId: string,
    shopifyProductId?: string,
  ): Promise<ApprovedReviewSummary>;
  getShopReviewVolumeSeries(
    shopId: string,
    days: number,
  ): Promise<VolumeSeriesPoint[]>;
  updateForShop(
    shopId: string,
    reviewId: string,
    input: UpdateReviewRecordInput,
  ): Promise<ReviewRecord | null>;
  setProductTitlesForShop(
    shopId: string,
    titlesByProductId: Map<string, string>,
  ): Promise<number>;
  redactCustomerPii(
    shopId: string,
    match: ReviewCustomerMatchInput,
  ): Promise<number>;
  deleteForShop(shopId: string, reviewId: string): Promise<boolean>;
}

const REVIEW_SELECT = {
  id: true,
  shopId: true,
  shopifyProductId: true,
  productTitle: true,
  shopifyCustomerId: true,
  rating: true,
  title: true,
  body: true,
  authorName: true,
  authorEmail: true,
  status: true,
  source: true,
  verifiedPurchase: true,
  featured: true,
  hasImage: true,
  hasVideo: true,
  merchantReply: true,
  merchantReplyAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ReviewModel = {
  create(args: {
    data: CreateReviewRecordInput;
    select: typeof REVIEW_SELECT;
  }): Promise<ReviewRecord>;
  findFirst(args: {
    where: { id: string; shopId: string };
    select: typeof REVIEW_SELECT;
  }): Promise<ReviewRecord | null>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
    take?: number;
    select: typeof REVIEW_SELECT;
  }): Promise<ReviewRecord[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  groupBy(args: {
    by: ["status"];
    where: { shopId: string };
    _count: { _all: true };
  }): Promise<Array<{ status: ReviewStatus; _count: { _all: number } }>>;
  aggregate(args: {
    where: { shopId: string; status: "APPROVED" };
    _avg: { rating: true };
  }): Promise<{ _avg: { rating: number | null } }>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: UpdateReviewRecordInput & {
      authorName?: string;
      authorEmail?: string | null;
      shopifyCustomerId?: string | null;
    };
  }): Promise<{ count: number }>;
  deleteMany(args: {
    where: { id: string; shopId: string };
  }): Promise<{ count: number }>;
};

function reviewModel(database: PrismaClient): ReviewModel {
  return (database as unknown as { review: ReviewModel }).review;
}

/** Each whitespace token must match at least one searchable text field. */
function buildReviewTextSearchFilter(
  query: string,
): Record<string, unknown> | null {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .slice(0, 8);

  if (tokens.length === 0) {
    return null;
  }

  const fieldMatchForToken = (token: string) => ({
    OR: [
      { authorName: { contains: token, mode: "insensitive" as const } },
      { title: { contains: token, mode: "insensitive" as const } },
      { body: { contains: token, mode: "insensitive" as const } },
      { productTitle: { contains: token, mode: "insensitive" as const } },
    ],
  });

  if (tokens.length === 1) {
    return fieldMatchForToken(tokens[0]!);
  }

  return { AND: tokens.map(fieldMatchForToken) };
}

function buildStorefrontCursorFilter(
  sort: StorefrontReviewSort,
  cursor: string | undefined,
): Record<string, unknown> | null {
  if (!cursor) {
    return null;
  }

  const decoded = decodeStorefrontReviewCursor(cursor, sort);
  if (!decoded) {
    return null;
  }

  const createdAt = new Date(decoded.createdAt);
  const id = decoded.id;

  if (sort === "highest_rating") {
    const rating = decoded.rating;
    if (typeof rating !== "number") {
      return null;
    }
    return {
      OR: [
        { rating: { lt: rating } },
        {
          AND: [
            { rating },
            { createdAt: { lt: createdAt } },
          ],
        },
        {
          AND: [{ rating }, { createdAt }, { id: { lt: id } }],
        },
      ],
    };
  }

  if (sort === "lowest_rating") {
    const rating = decoded.rating;
    if (typeof rating !== "number") {
      return null;
    }
    return {
      OR: [
        { rating: { gt: rating } },
        {
          AND: [
            { rating },
            { createdAt: { lt: createdAt } },
          ],
        },
        {
          AND: [{ rating }, { createdAt }, { id: { lt: id } }],
        },
      ],
    };
  }

  if (sort === "pictures_first") {
    if (typeof decoded.hasImage !== "boolean") {
      return null;
    }
    // ORDER BY hasImage DESC — after a true row, remaining trues then falses.
    if (decoded.hasImage) {
      return {
        OR: [
          { hasImage: false },
          {
            AND: [{ hasImage: true }, { createdAt: { lt: createdAt } }],
          },
          {
            AND: [{ hasImage: true }, { createdAt }, { id: { lt: id } }],
          },
        ],
      };
    }
    return {
      OR: [
        {
          AND: [{ hasImage: false }, { createdAt: { lt: createdAt } }],
        },
        {
          AND: [{ hasImage: false }, { createdAt }, { id: { lt: id } }],
        },
      ],
    };
  }

  if (sort === "videos_first") {
    if (typeof decoded.hasVideo !== "boolean") {
      return null;
    }
    if (decoded.hasVideo) {
      return {
        OR: [
          { hasVideo: false },
          {
            AND: [{ hasVideo: true }, { createdAt: { lt: createdAt } }],
          },
          {
            AND: [{ hasVideo: true }, { createdAt }, { id: { lt: id } }],
          },
        ],
      };
    }
    return {
      OR: [
        {
          AND: [{ hasVideo: false }, { createdAt: { lt: createdAt } }],
        },
        {
          AND: [{ hasVideo: false }, { createdAt }, { id: { lt: id } }],
        },
      ],
    };
  }

  // most_recent + only_pictures
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      {
        AND: [{ createdAt }, { id: { lt: id } }],
      },
    ],
  };
}

function storefrontOrderBy(
  sort: StorefrontReviewSort,
): Array<Record<string, "asc" | "desc">> {
  switch (sort) {
    case "highest_rating":
      return [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "lowest_rating":
      return [{ rating: "asc" }, { createdAt: "desc" }, { id: "desc" }];
    case "pictures_first":
      return [{ hasImage: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "videos_first":
      return [{ hasVideo: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "only_pictures":
    case "most_recent":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

function encodeStorefrontPageCursor(
  sort: StorefrontReviewSort,
  review: ReviewRecord,
): string {
  return encodeStorefrontReviewCursor({
    v: 1,
    sort,
    createdAt: review.createdAt.toISOString(),
    id: review.id,
    rating:
      sort === "highest_rating" || sort === "lowest_rating"
        ? review.rating
        : undefined,
    hasImage: sort === "pictures_first" ? review.hasImage : undefined,
    hasVideo: sort === "videos_first" ? review.hasVideo : undefined,
  });
}

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: CreateReviewRecordInput): Promise<ReviewRecord> {
    return reviewModel(this.database).create({
      data: input,
      select: REVIEW_SELECT,
    });
  }

  async findByIdForShop(
    shopId: string,
    reviewId: string,
  ): Promise<ReviewRecord | null> {
    return reviewModel(this.database).findFirst({
      where: { id: reviewId, shopId },
      select: REVIEW_SELECT,
    });
  }

  async findByIdsForShop(
    shopId: string,
    reviewIds: string[],
  ): Promise<ReviewRecord[]> {
    if (reviewIds.length === 0) {
      return [];
    }

    return reviewModel(this.database).findMany({
      where: {
        shopId,
        id: { in: reviewIds },
      },
      select: REVIEW_SELECT,
    });
  }

  async findForCustomerPrivacy(
    shopId: string,
    match: ReviewCustomerMatchInput,
  ): Promise<ReviewRecord[]> {
    const orFilters = buildCustomerOrFilters(match);
    if (orFilters.length === 0) {
      return [];
    }

    return reviewModel(this.database).findMany({
      where: {
        shopId,
        OR: orFilters,
      },
      select: REVIEW_SELECT,
    });
  }

  async list(input: ListReviewsInput): Promise<ListReviewsResult> {
    const andFilters: Array<Record<string, unknown>> = [];

    if (input.status) {
      andFilters.push({ status: input.status });
    }

    if (input.shopifyProductId) {
      andFilters.push({ shopifyProductId: input.shopifyProductId });
    }

    if (input.query) {
      const searchFilter = buildReviewTextSearchFilter(input.query);
      if (searchFilter) {
        andFilters.push(searchFilter);
      }
    }

    if (input.cursor) {
      const decoded = decodeReviewCursor(input.cursor);
      if (decoded) {
        andFilters.push({
          OR: [
            { createdAt: { lt: decoded.createdAt } },
            {
              AND: [
                { createdAt: decoded.createdAt },
                { id: { lt: decoded.id } },
              ],
            },
          ],
        });
      }
    }

    const where: Record<string, unknown> = {
      shopId: input.shopId,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    const rows = await reviewModel(this.database).findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      select: REVIEW_SELECT,
    });

    const hasNextPage = rows.length > input.limit;
    const items = hasNextPage ? rows.slice(0, input.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor: last
          ? encodeReviewCursor(last.createdAt, last.id)
          : null,
      },
    };
  }

  async listForStorefront(
    input: ListStorefrontReviewsInput,
  ): Promise<ListReviewsResult> {
    const andFilters: Array<Record<string, unknown>> = [
      { status: "APPROVED" },
      { shopifyProductId: input.shopifyProductId },
    ];

    if (input.sort === "only_pictures") {
      andFilters.push({ hasImage: true });
    }

    const cursorFilter = buildStorefrontCursorFilter(input.sort, input.cursor);
    if (cursorFilter) {
      andFilters.push(cursorFilter);
    }

    const rows = await reviewModel(this.database).findMany({
      where: {
        shopId: input.shopId,
        AND: andFilters,
      },
      orderBy: storefrontOrderBy(input.sort),
      take: input.limit + 1,
      select: REVIEW_SELECT,
    });

    const hasNextPage = rows.length > input.limit;
    const items = hasNextPage ? rows.slice(0, input.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor: last ? encodeStorefrontPageCursor(input.sort, last) : null,
      },
    };
  }

  async refreshMediaFlags(shopId: string, reviewId: string): Promise<void> {
    const mediaRows = await this.database.reviewMedia.findMany({
      where: { shopId, reviewId },
      select: { kind: true },
    });

    const hasImage = mediaRows.some((row) => row.kind === "IMAGE");
    const hasVideo = mediaRows.some((row) => row.kind === "VIDEO");

    await this.database.review.updateMany({
      where: { id: reviewId, shopId },
      data: { hasImage, hasVideo },
    });
  }

  async listProductsForShop(
    input: ListProductsForShopInput,
  ): Promise<ListProductsForShopResult> {
    const andFilters: Array<Record<string, unknown>> = [];

    if (input.query) {
      andFilters.push({
        OR: [
          {
            productTitle: {
              contains: input.query,
              mode: "insensitive",
            },
          },
          {
            shopifyProductId: {
              contains: input.query,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (input.cursor) {
      andFilters.push({
        shopifyProductId: { gt: input.cursor },
      });
    }

    const where: Record<string, unknown> = {
      shopId: input.shopId,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    const grouped = await this.database.review.groupBy({
      by: ["shopifyProductId"],
      where,
      _count: { _all: true },
      orderBy: { shopifyProductId: "asc" },
      take: input.limit + 1,
    });

    const hasNextPage = grouped.length > input.limit;
    const page = hasNextPage ? grouped.slice(0, input.limit) : grouped;
    const productIds = page.map((row) => row.shopifyProductId);

    if (productIds.length === 0) {
      return {
        items: [],
        pageInfo: { nextCursor: null, hasNextPage: false },
      };
    }

    const [statusRows, approvedAvgRows, titleRows] = await Promise.all([
      this.database.review.groupBy({
        by: ["shopifyProductId", "status"],
        where: {
          shopId: input.shopId,
          shopifyProductId: { in: productIds },
        },
        _count: { _all: true },
      }),
      this.database.review.groupBy({
        by: ["shopifyProductId"],
        where: {
          shopId: input.shopId,
          shopifyProductId: { in: productIds },
          status: "APPROVED",
        },
        _avg: { rating: true },
      }),
      this.database.review.findMany({
        where: {
          shopId: input.shopId,
          shopifyProductId: { in: productIds },
          productTitle: { not: null },
        },
        select: {
          shopifyProductId: true,
          productTitle: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const pendingByProduct = new Map<string, number>();
    for (const row of statusRows) {
      if (row.status === "PENDING") {
        pendingByProduct.set(row.shopifyProductId, row._count._all);
      }
    }

    const avgByProduct = new Map<string, number | null>();
    for (const row of approvedAvgRows) {
      avgByProduct.set(
        row.shopifyProductId,
        row._avg.rating == null
          ? null
          : Math.round(row._avg.rating * 10) / 10,
      );
    }

    const titleByProduct = new Map<string, string>();
    for (const row of titleRows) {
      if (
        row.productTitle?.trim() &&
        !titleByProduct.has(row.shopifyProductId)
      ) {
        titleByProduct.set(row.shopifyProductId, row.productTitle.trim());
      }
    }

    const items: ProductReviewSummary[] = page.map((row) => ({
      shopifyProductId: row.shopifyProductId,
      productTitle: titleByProduct.get(row.shopifyProductId) ?? null,
      totalReviews: row._count._all,
      pendingReviews: pendingByProduct.get(row.shopifyProductId) ?? 0,
      averageApprovedRating: avgByProduct.get(row.shopifyProductId) ?? null,
    }));

    const last = items[items.length - 1];

    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor: last?.shopifyProductId ?? null,
      },
    };
  }

  async getProductStatsForShop(
    shopId: string,
    shopifyProductId: string,
  ): Promise<ProductReviewStats> {
    const where = { shopId, shopifyProductId };

    const [statusRows, approvedAvg, withMedia, ratingRows] = await Promise.all([
      this.database.review.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.database.review.aggregate({
        where: { ...where, status: "APPROVED" },
        _avg: { rating: true },
      }),
      this.database.review.count({
        where: {
          ...where,
          media: { some: {} },
        },
      }),
      this.database.review.groupBy({
        by: ["rating"],
        where,
        _count: { _all: true },
      }),
    ]);

    const counts: ReviewStatusCounts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const row of statusRows) {
      counts[row.status] = row._count._all;
    }

    const ratingDistribution: ProductReviewStats["ratingDistribution"] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of ratingRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        ratingDistribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
      }
    }

    return {
      totalReviews: counts.PENDING + counts.APPROVED + counts.REJECTED,
      pendingReviews: counts.PENDING,
      approvedReviews: counts.APPROVED,
      rejectedReviews: counts.REJECTED,
      reviewsWithMedia: withMedia,
      averageApprovedRating:
        approvedAvg._avg.rating == null
          ? null
          : Math.round(approvedAvg._avg.rating * 10) / 10,
      ratingDistribution,
    };
  }

  async getProductReviewTrendForShop(
    shopId: string,
    shopifyProductId: string,
    months = 12,
  ): Promise<ProductReviewTrendPoint[]> {
    const monthCount = Math.min(Math.max(months, 1), 24);
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthCount - 1), 1),
    );

    const rows = await this.database.review.findMany({
      where: {
        shopId,
        shopifyProductId,
        createdAt: { gte: start },
      },
      select: { createdAt: true },
    });

    return buildMonthlyReviewTrend(
      rows.map((row) => row.createdAt),
      monthCount,
      now,
    );
  }

  async getProductRatingTrendForShop(
    shopId: string,
    shopifyProductId: string,
    months = 12,
  ): Promise<ProductRatingTrendPoint[]> {
    const monthCount = Math.min(Math.max(months, 1), 24);
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthCount - 1), 1),
    );

    const rows = await this.database.review.findMany({
      where: {
        shopId,
        shopifyProductId,
        status: "APPROVED",
        createdAt: { gte: start },
      },
      select: { createdAt: true, rating: true },
    });

    return buildMonthlyRatingTrend(rows, monthCount, now);
  }

  async countApprovedForShop(shopId: string): Promise<number> {
    return reviewModel(this.database).count({
      where: { shopId, status: "APPROVED" },
    });
  }

  async countByStatusForShop(shopId: string): Promise<ReviewStatusCounts> {
    const rows = await reviewModel(this.database).groupBy({
      by: ["status"],
      where: { shopId },
      _count: { _all: true },
    });

    const counts: ReviewStatusCounts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    for (const row of rows) {
      counts[row.status] = row._count._all;
    }

    return counts;
  }

  async averageApprovedRatingForShop(
    shopId: string,
  ): Promise<number | null> {
    const result = await reviewModel(this.database).aggregate({
      where: { shopId, status: "APPROVED" },
      _avg: { rating: true },
    });

    if (result._avg.rating == null) {
      return null;
    }

    return Math.round(result._avg.rating * 10) / 10;
  }

  async getShopReviewVolumeSeries(
    shopId: string,
    days: number,
  ): Promise<VolumeSeriesPoint[]> {
    const dayCount = Math.min(Math.max(days, 1), 366);
    const now = new Date();
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (dayCount - 1),
      ),
    );

    const rows = await this.database.$queryRaw<
      Array<{ date_key: Date; count: bigint | number }>
    >(Prisma.sql`
      SELECT
        date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS date_key,
        COUNT(*)::int AS count
      FROM "Review"
      WHERE "shopId" = ${shopId}
        AND "createdAt" >= ${start}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const dayCounts = rows.map((row) => {
      const date =
        row.date_key instanceof Date ? row.date_key : new Date(row.date_key);
      return {
        dateKey: date.toISOString().slice(0, 10),
        count: Number(row.count),
      };
    });

    return buildDailyReviewVolumeSeriesFromCounts(dayCounts, dayCount, now);
  }

  async getApprovedSummaryForShop(
    shopId: string,
    shopifyProductId?: string,
  ): Promise<ApprovedReviewSummary> {
    const where = {
      shopId,
      status: "APPROVED" as const,
      ...(shopifyProductId ? { shopifyProductId } : {}),
    };

    const [aggregate, ratingRows] = await Promise.all([
      this.database.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.database.review.groupBy({
        by: ["rating"],
        where,
        _count: { _all: true },
      }),
    ]);

    const ratingDistribution: ApprovedReviewSummary["ratingDistribution"] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of ratingRows) {
      const rating = row.rating as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating] = row._count._all;
      }
    }

    return {
      approvedCount: aggregate._count._all,
      averageRating:
        aggregate._avg.rating == null
          ? null
          : Math.round(aggregate._avg.rating * 10) / 10,
      ratingDistribution,
    };
  }

  async updateForShop(
    shopId: string,
    reviewId: string,
    input: UpdateReviewRecordInput,
  ): Promise<ReviewRecord | null> {
    const result = await reviewModel(this.database).updateMany({
      where: { id: reviewId, shopId },
      data: input,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdForShop(shopId, reviewId);
  }

  async setProductTitlesForShop(
    shopId: string,
    titlesByProductId: Map<string, string>,
  ): Promise<number> {
    let updated = 0;
    for (const [shopifyProductId, productTitle] of titlesByProductId) {
      const title = productTitle.trim();
      if (!title) {
        continue;
      }
      const result = await reviewModel(this.database).updateMany({
        where: {
          shopId,
          shopifyProductId,
          OR: [{ productTitle: null }, { productTitle: "" }],
        },
        data: { productTitle: title },
      });
      updated += result.count;
    }
    return updated;
  }

  async redactCustomerPii(
    shopId: string,
    match: ReviewCustomerMatchInput,
  ): Promise<number> {
    const orFilters = buildCustomerOrFilters(match);
    if (orFilters.length === 0) {
      return 0;
    }

    const result = await reviewModel(this.database).updateMany({
      where: {
        shopId,
        OR: orFilters,
      },
      data: {
        authorName: "Redacted customer",
        authorEmail: null,
        shopifyCustomerId: null,
      },
    });

    return result.count;
  }

  async deleteForShop(shopId: string, reviewId: string): Promise<boolean> {
    const result = await reviewModel(this.database).deleteMany({
      where: { id: reviewId, shopId },
    });

    return result.count > 0;
  }
}

function buildCustomerOrFilters(
  match: ReviewCustomerMatchInput,
): Array<Record<string, unknown>> {
  const filters: Array<Record<string, unknown>> = [];

  if (match.email) {
    filters.push({
      authorEmail: { equals: match.email, mode: "insensitive" },
    });
  }

  if (match.customerIds.length > 0) {
    filters.push({
      shopifyCustomerId: { in: match.customerIds },
    });
  }

  return filters;
}

export const reviewRepository = new PrismaReviewRepository();
