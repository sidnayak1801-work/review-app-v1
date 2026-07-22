import type { PrismaClient } from "@prisma/client";

import prisma from "../db.server";

export type ReviewRequestStatus =
  | "SCHEDULED"
  | "SENT"
  | "FAILED"
  | "CANCELLED"
  | "COMPLETED";

export interface ReviewRequestRecord {
  id: string;
  shopId: string;
  shopifyOrderId: string;
  shopifyProductId: string;
  customerEmail: string;
  status: ReviewRequestStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  reminderSentAt: Date | null;
  attemptCount: number;
  lastErrorCode: string | null;
  submissionTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRequestInput {
  shopId: string;
  shopifyOrderId: string;
  shopifyProductId: string;
  customerEmail: string;
  scheduledAt: Date;
  submissionTokenHash: string;
}

export interface UpdateReviewRequestInput {
  status?: ReviewRequestStatus;
  scheduledAt?: Date;
  sentAt?: Date | null;
  reminderSentAt?: Date | null;
  attemptCount?: number;
  lastErrorCode?: string | null;
  submissionTokenHash?: string;
  customerEmail?: string;
}

export interface ReviewRequestCustomerMatchInput {
  email: string | null;
}

export interface ReviewRequestRepository {
  create(input: CreateReviewRequestInput): Promise<ReviewRequestRecord>;
  findByIdForShop(
    shopId: string,
    requestId: string,
  ): Promise<ReviewRequestRecord | null>;
  findByTokenHash(
    tokenHash: string,
  ): Promise<ReviewRequestRecord | null>;
  findDueForProcessing(
    limit: number,
    now?: Date,
  ): Promise<ReviewRequestRecord[]>;
  findDueForReminder(
    limit: number,
    now?: Date,
  ): Promise<ReviewRequestRecord[]>;
  findByOrderForShop(
    shopId: string,
    shopifyOrderId: string,
  ): Promise<ReviewRequestRecord[]>;
  findForCustomerPrivacy(
    shopId: string,
    match: ReviewRequestCustomerMatchInput,
  ): Promise<ReviewRequestRecord[]>;
  listForShop(
    shopId: string,
    limit: number,
  ): Promise<ReviewRequestRecord[]>;
  countSentForShopInUtcMonth(
    shopId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number>;
  updateForShop(
    shopId: string,
    requestId: string,
    input: UpdateReviewRequestInput,
  ): Promise<ReviewRequestRecord | null>;
  updateManyForOrder(
    shopId: string,
    shopifyOrderId: string,
    requestIds: string[],
    input: UpdateReviewRequestInput,
  ): Promise<number>;
  redactCustomerPii(
    shopId: string,
    match: ReviewRequestCustomerMatchInput,
  ): Promise<number>;
}

const REVIEW_REQUEST_SELECT = {
  id: true,
  shopId: true,
  shopifyOrderId: true,
  shopifyProductId: true,
  customerEmail: true,
  status: true,
  scheduledAt: true,
  sentAt: true,
  reminderSentAt: true,
  attemptCount: true,
  lastErrorCode: true,
  submissionTokenHash: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ReviewRequestModel = {
  create(args: {
    data: CreateReviewRequestInput;
    select: typeof REVIEW_REQUEST_SELECT;
  }): Promise<ReviewRequestRecord>;
  findFirst(args: {
    where: Record<string, unknown>;
    select: typeof REVIEW_REQUEST_SELECT;
  }): Promise<ReviewRequestRecord | null>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
    take?: number;
    select: typeof REVIEW_REQUEST_SELECT;
  }): Promise<ReviewRequestRecord[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  groupBy(args: {
    by: ["shopifyOrderId"];
    where: Record<string, unknown>;
  }): Promise<Array<{ shopifyOrderId: string }>>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: UpdateReviewRequestInput;
  }): Promise<{ count: number }>;
};

function reviewRequestModel(database: PrismaClient): ReviewRequestModel {
  return (database as unknown as { reviewRequest: ReviewRequestModel })
    .reviewRequest;
}

export class PrismaReviewRequestRepository implements ReviewRequestRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: CreateReviewRequestInput): Promise<ReviewRequestRecord> {
    return reviewRequestModel(this.database).create({
      data: input,
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findByIdForShop(
    shopId: string,
    requestId: string,
  ): Promise<ReviewRequestRecord | null> {
    return reviewRequestModel(this.database).findFirst({
      where: { id: requestId, shopId },
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<ReviewRequestRecord | null> {
    return reviewRequestModel(this.database).findFirst({
      where: {
        submissionTokenHash: tokenHash,
        status: { in: ["SCHEDULED", "SENT"] },
      },
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findDueForProcessing(
    limit: number,
    now: Date = new Date(),
  ): Promise<ReviewRequestRecord[]> {
    return reviewRequestModel(this.database).findMany({
      where: {
        status: { in: ["SCHEDULED", "FAILED"] },
        scheduledAt: { lte: now },
        attemptCount: { lt: 3 },
      },
      orderBy: [{ scheduledAt: "asc" }],
      take: limit,
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findDueForReminder(
    limit: number,
    now: Date = new Date(),
  ): Promise<ReviewRequestRecord[]> {
    return reviewRequestModel(this.database).findMany({
      where: {
        status: "SENT",
        reminderSentAt: null,
        sentAt: { not: null, lte: now },
      },
      orderBy: [{ sentAt: "asc" }],
      take: limit,
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findByOrderForShop(
    shopId: string,
    shopifyOrderId: string,
  ): Promise<ReviewRequestRecord[]> {
    return reviewRequestModel(this.database).findMany({
      where: { shopId, shopifyOrderId },
      orderBy: [{ createdAt: "asc" }],
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async listForShop(
    shopId: string,
    limit: number,
  ): Promise<ReviewRequestRecord[]> {
    return reviewRequestModel(this.database).findMany({
      where: { shopId },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async findForCustomerPrivacy(
    shopId: string,
    match: ReviewRequestCustomerMatchInput,
  ): Promise<ReviewRequestRecord[]> {
    if (!match.email) {
      return [];
    }

    return reviewRequestModel(this.database).findMany({
      where: {
        shopId,
        customerEmail: { equals: match.email, mode: "insensitive" },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
      select: REVIEW_REQUEST_SELECT,
    });
  }

  async countSentForShopInUtcMonth(
    shopId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    const firstSendOrders = await reviewRequestModel(this.database).groupBy({
      by: ["shopifyOrderId"],
      where: {
        shopId,
        sentAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    const reminderCredits = await reviewRequestModel(this.database).count({
      where: {
        shopId,
        reminderSentAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    return firstSendOrders.length + reminderCredits;
  }

  async updateForShop(
    shopId: string,
    requestId: string,
    input: UpdateReviewRequestInput,
  ): Promise<ReviewRequestRecord | null> {
    const result = await reviewRequestModel(this.database).updateMany({
      where: { id: requestId, shopId },
      data: input,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdForShop(shopId, requestId);
  }

  async updateManyForOrder(
    shopId: string,
    shopifyOrderId: string,
    requestIds: string[],
    input: UpdateReviewRequestInput,
  ): Promise<number> {
    if (requestIds.length === 0) {
      return 0;
    }

    const result = await reviewRequestModel(this.database).updateMany({
      where: {
        shopId,
        shopifyOrderId,
        id: { in: requestIds },
      },
      data: input,
    });

    return result.count;
  }

  async redactCustomerPii(
    shopId: string,
    match: ReviewRequestCustomerMatchInput,
  ): Promise<number> {
    if (!match.email) {
      return 0;
    }

    const result = await reviewRequestModel(this.database).updateMany({
      where: {
        shopId,
        customerEmail: { equals: match.email, mode: "insensitive" },
      },
      data: {
        customerEmail: "redacted@invalid.local",
        status: "CANCELLED",
        lastErrorCode: "CUSTOMER_REDACTED",
        submissionTokenHash: `redacted:${shopId}:${Date.now()}`,
      },
    });

    return result.count;
  }
}

export const reviewRequestRepository = new PrismaReviewRequestRepository();
