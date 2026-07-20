import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type ReviewImportStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface ReviewImportRecord {
  id: string;
  shopId: string;
  status: ReviewImportStatus;
  fileKey: string;
  contentHash: string | null;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errorFileKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewImportInput {
  shopId: string;
  fileKey: string;
  contentHash: string;
  totalRows: number;
}

export interface UpdateReviewImportInput {
  status?: ReviewImportStatus;
  fileKey?: string;
  importedRows?: number;
  failedRows?: number;
  errorFileKey?: string | null;
}

export interface ReviewImportRepository {
  create(input: CreateReviewImportInput): Promise<ReviewImportRecord>;
  findByIdForShop(
    shopId: string,
    importId: string,
  ): Promise<ReviewImportRecord | null>;
  findByContentHashForShop(
    shopId: string,
    contentHash: string,
  ): Promise<ReviewImportRecord | null>;
  listRecentForShop(
    shopId: string,
    limit: number,
  ): Promise<ReviewImportRecord[]>;
  updateForShop(
    shopId: string,
    importId: string,
    input: UpdateReviewImportInput,
  ): Promise<ReviewImportRecord | null>;
}

const REVIEW_IMPORT_SELECT = {
  id: true,
  shopId: true,
  status: true,
  fileKey: true,
  contentHash: true,
  totalRows: true,
  importedRows: true,
  failedRows: true,
  errorFileKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ReviewImportModel = {
  create(args: {
    data: CreateReviewImportInput & { status?: ReviewImportStatus };
    select: typeof REVIEW_IMPORT_SELECT;
  }): Promise<ReviewImportRecord>;
  findFirst(args: {
    where: Record<string, unknown>;
    select: typeof REVIEW_IMPORT_SELECT;
  }): Promise<ReviewImportRecord | null>;
  findMany(args: {
    where: { shopId: string };
    orderBy: Array<Record<string, "asc" | "desc">>;
    take: number;
    select: typeof REVIEW_IMPORT_SELECT;
  }): Promise<ReviewImportRecord[]>;
  updateMany(args: {
    where: { id: string; shopId: string };
    data: UpdateReviewImportInput;
  }): Promise<{ count: number }>;
};

function reviewImportModel(database: PrismaClient): ReviewImportModel {
  return (database as unknown as { reviewImport: ReviewImportModel })
    .reviewImport;
}

export class PrismaReviewImportRepository implements ReviewImportRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: CreateReviewImportInput): Promise<ReviewImportRecord> {
    return reviewImportModel(this.database).create({
      data: {
        ...input,
        status: "PENDING",
      },
      select: REVIEW_IMPORT_SELECT,
    });
  }

  async findByIdForShop(
    shopId: string,
    importId: string,
  ): Promise<ReviewImportRecord | null> {
    return reviewImportModel(this.database).findFirst({
      where: { id: importId, shopId },
      select: REVIEW_IMPORT_SELECT,
    });
  }

  async findByContentHashForShop(
    shopId: string,
    contentHash: string,
  ): Promise<ReviewImportRecord | null> {
    return reviewImportModel(this.database).findFirst({
      where: { shopId, contentHash },
      select: REVIEW_IMPORT_SELECT,
    });
  }

  async listRecentForShop(
    shopId: string,
    limit: number,
  ): Promise<ReviewImportRecord[]> {
    return reviewImportModel(this.database).findMany({
      where: { shopId },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: REVIEW_IMPORT_SELECT,
    });
  }

  async updateForShop(
    shopId: string,
    importId: string,
    input: UpdateReviewImportInput,
  ): Promise<ReviewImportRecord | null> {
    const result = await reviewImportModel(this.database).updateMany({
      where: { id: importId, shopId },
      data: input,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdForShop(shopId, importId);
  }
}

export const reviewImportRepository = new PrismaReviewImportRepository();
