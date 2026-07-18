import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";
import {
  decodeReviewCursor,
  encodeReviewCursor,
} from "../lib/shopify-ids";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewSource = "STOREFRONT" | "MERCHANT" | "IMPORT";

export interface ReviewRecord {
  id: string;
  shopId: string;
  shopifyProductId: string;
  shopifyCustomerId: string | null;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorEmail: string | null;
  status: ReviewStatus;
  source: ReviewSource;
  verifiedPurchase: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRecordInput {
  shopId: string;
  shopifyProductId: string;
  shopifyCustomerId?: string;
  rating: number;
  title?: string;
  body: string;
  authorName: string;
  authorEmail?: string;
  status: ReviewStatus;
  source: ReviewSource;
  verifiedPurchase?: boolean;
  publishedAt?: Date | null;
}

export interface UpdateReviewRecordInput {
  rating?: number;
  title?: string | null;
  body?: string;
  authorName?: string;
  authorEmail?: string | null;
  status?: ReviewStatus;
  verifiedPurchase?: boolean;
  publishedAt?: Date | null;
}

export interface ListReviewsInput {
  shopId: string;
  status?: ReviewStatus;
  shopifyProductId?: string;
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

export interface ReviewRepository {
  create(input: CreateReviewRecordInput): Promise<ReviewRecord>;
  findByIdForShop(
    shopId: string,
    reviewId: string,
  ): Promise<ReviewRecord | null>;
  list(input: ListReviewsInput): Promise<ListReviewsResult>;
  updateForShop(
    shopId: string,
    reviewId: string,
    input: UpdateReviewRecordInput,
  ): Promise<ReviewRecord | null>;
  deleteForShop(shopId: string, reviewId: string): Promise<boolean>;
}

const REVIEW_SELECT = {
  id: true,
  shopId: true,
  shopifyProductId: true,
  shopifyCustomerId: true,
  rating: true,
  title: true,
  body: true,
  authorName: true,
  authorEmail: true,
  status: true,
  source: true,
  verifiedPurchase: true,
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
    orderBy: Array<Record<string, "asc" | "desc">>;
    take: number;
    select: typeof REVIEW_SELECT;
  }): Promise<ReviewRecord[]>;
  updateMany(args: {
    where: { id: string; shopId: string };
    data: UpdateReviewRecordInput;
  }): Promise<{ count: number }>;
  deleteMany(args: {
    where: { id: string; shopId: string };
  }): Promise<{ count: number }>;
};

function reviewModel(database: PrismaClient): ReviewModel {
  return (database as unknown as { review: ReviewModel }).review;
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

  async list(input: ListReviewsInput): Promise<ListReviewsResult> {
    const where: Record<string, unknown> = {
      shopId: input.shopId,
    };

    if (input.status) {
      where.status = input.status;
    }

    if (input.shopifyProductId) {
      where.shopifyProductId = input.shopifyProductId;
    }

    if (input.cursor) {
      const decoded = decodeReviewCursor(input.cursor);
      if (decoded) {
        where.OR = [
          { createdAt: { lt: decoded.createdAt } },
          {
            AND: [
              { createdAt: decoded.createdAt },
              { id: { lt: decoded.id } },
            ],
          },
        ];
      }
    }

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

  async deleteForShop(shopId: string, reviewId: string): Promise<boolean> {
    const result = await reviewModel(this.database).deleteMany({
      where: { id: reviewId, shopId },
    });

    return result.count > 0;
  }
}

export const reviewRepository = new PrismaReviewRepository();
