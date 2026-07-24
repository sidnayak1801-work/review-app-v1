import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type ReviewMediaKind = "IMAGE" | "VIDEO";

export interface ReviewMediaRecord {
  id: string;
  shopId: string;
  reviewId: string | null;
  kind: ReviewMediaKind;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewMediaInput {
  shopId: string;
  reviewId?: string | null;
  kind: ReviewMediaKind;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  position?: number;
}

export interface ReviewMediaRepository {
  create(input: CreateReviewMediaInput): Promise<ReviewMediaRecord>;
  findByIdsForShop(
    shopId: string,
    mediaIds: string[],
  ): Promise<ReviewMediaRecord[]>;
  listForReview(
    shopId: string,
    reviewId: string,
  ): Promise<ReviewMediaRecord[]>;
  listForReviews(
    shopId: string,
    reviewIds: string[],
  ): Promise<ReviewMediaRecord[]>;
  attachToReview(
    shopId: string,
    reviewId: string,
    mediaIds: string[],
  ): Promise<number>;
}

const MEDIA_SELECT = {
  id: true,
  shopId: true,
  reviewId: true,
  kind: true,
  storageKey: true,
  url: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ReviewMediaModel = {
  create(args: {
    data: CreateReviewMediaInput;
    select: typeof MEDIA_SELECT;
  }): Promise<ReviewMediaRecord>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
    select: typeof MEDIA_SELECT;
  }): Promise<ReviewMediaRecord[]>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: { reviewId: string };
  }): Promise<{ count: number }>;
};

function reviewMediaModel(database: PrismaClient): ReviewMediaModel {
  return (database as unknown as { reviewMedia: ReviewMediaModel }).reviewMedia;
}

export class PrismaReviewMediaRepository implements ReviewMediaRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: CreateReviewMediaInput): Promise<ReviewMediaRecord> {
    return reviewMediaModel(this.database).create({
      data: {
        ...input,
        reviewId: input.reviewId ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        position: input.position ?? 0,
      },
      select: MEDIA_SELECT,
    });
  }

  async findByIdsForShop(
    shopId: string,
    mediaIds: string[],
  ): Promise<ReviewMediaRecord[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    return reviewMediaModel(this.database).findMany({
      where: {
        shopId,
        id: { in: mediaIds },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: MEDIA_SELECT,
    });
  }

  async listForReview(
    shopId: string,
    reviewId: string,
  ): Promise<ReviewMediaRecord[]> {
    return reviewMediaModel(this.database).findMany({
      where: { shopId, reviewId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: MEDIA_SELECT,
    });
  }

  async listForReviews(
    shopId: string,
    reviewIds: string[],
  ): Promise<ReviewMediaRecord[]> {
    if (reviewIds.length === 0) {
      return [];
    }

    return reviewMediaModel(this.database).findMany({
      where: {
        shopId,
        reviewId: { in: reviewIds },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: MEDIA_SELECT,
    });
  }

  async attachToReview(
    shopId: string,
    reviewId: string,
    mediaIds: string[],
  ): Promise<number> {
    if (mediaIds.length === 0) {
      return 0;
    }

    const result = await reviewMediaModel(this.database).updateMany({
      where: {
        shopId,
        id: { in: mediaIds },
        reviewId: null,
      },
      data: { reviewId },
    });

    return result.count;
  }
}

export const reviewMediaRepository = new PrismaReviewMediaRepository();
