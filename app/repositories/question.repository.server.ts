import type { Prisma, PrismaClient } from "@prisma/client";

import prisma from "../db.server";
import {
  decodeReviewCursor,
  encodeReviewCursor,
} from "../lib/shopify-ids";

export type QuestionStatus =
  | "PENDING"
  | "PUBLISHED"
  | "HIDDEN"
  | "ANSWERED";

export interface QuestionRecord {
  id: string;
  shopId: string;
  shopifyProductId: string;
  productTitle: string | null;
  customerName: string;
  email: string;
  question: string;
  answer: string | null;
  status: QuestionStatus;
  answeredAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionRecordInput {
  shopId: string;
  shopifyProductId: string;
  productTitle?: string | null;
  customerName: string;
  email: string;
  question: string;
  status?: QuestionStatus;
}

export interface UpdateQuestionRecordInput {
  productTitle?: string | null;
  customerName?: string;
  email?: string;
  question?: string;
  answer?: string | null;
  status?: QuestionStatus;
  answeredAt?: Date | null;
  publishedAt?: Date | null;
}

export interface ListQuestionsInput {
  shopId: string;
  status?: QuestionStatus;
  shopifyProductId?: string;
  query?: string;
  cursor?: string;
  limit: number;
  statuses?: QuestionStatus[];
}

export interface ListQuestionsResult {
  items: QuestionRecord[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface QuestionStatusCounts {
  PENDING: number;
  PUBLISHED: number;
  HIDDEN: number;
  ANSWERED: number;
}

export interface QuestionCustomerMatchInput {
  email: string | null;
}

const QUESTION_SELECT = {
  id: true,
  shopId: true,
  shopifyProductId: true,
  productTitle: true,
  customerName: true,
  email: true,
  question: true,
  answer: true,
  status: true,
  answeredAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.QuestionSelect;

function questionModel(database: PrismaClient) {
  return database.question;
}

export interface QuestionRepository {
  create(input: CreateQuestionRecordInput): Promise<QuestionRecord>;
  findByIdForShop(
    shopId: string,
    questionId: string,
  ): Promise<QuestionRecord | null>;
  list(input: ListQuestionsInput): Promise<ListQuestionsResult>;
  countByStatusForShop(shopId: string): Promise<QuestionStatusCounts>;
  updateForShop(
    shopId: string,
    questionId: string,
    input: UpdateQuestionRecordInput,
  ): Promise<QuestionRecord | null>;
  deleteForShop(shopId: string, questionId: string): Promise<boolean>;
  findForCustomerPrivacy(
    shopId: string,
    match: QuestionCustomerMatchInput,
  ): Promise<QuestionRecord[]>;
  redactCustomerPii(
    shopId: string,
    match: QuestionCustomerMatchInput,
  ): Promise<number>;
}

export class PrismaQuestionRepository implements QuestionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async create(input: CreateQuestionRecordInput): Promise<QuestionRecord> {
    return questionModel(this.database).create({
      data: {
        shopId: input.shopId,
        shopifyProductId: input.shopifyProductId,
        productTitle: input.productTitle ?? null,
        customerName: input.customerName,
        email: input.email,
        question: input.question,
        status: input.status ?? "PENDING",
      },
      select: QUESTION_SELECT,
    });
  }

  async findByIdForShop(
    shopId: string,
    questionId: string,
  ): Promise<QuestionRecord | null> {
    return questionModel(this.database).findFirst({
      where: { id: questionId, shopId },
      select: QUESTION_SELECT,
    });
  }

  async list(input: ListQuestionsInput): Promise<ListQuestionsResult> {
    const where: Prisma.QuestionWhereInput = {
      shopId: input.shopId,
    };

    if (input.status) {
      where.status = input.status;
    } else if (input.statuses?.length) {
      where.status = { in: input.statuses };
    }

    if (input.shopifyProductId) {
      where.shopifyProductId = input.shopifyProductId;
    }

    const query = input.query?.trim();
    if (query) {
      where.OR = [
        { question: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { productTitle: { contains: query, mode: "insensitive" } },
        { answer: { contains: query, mode: "insensitive" } },
      ];
    }

    if (input.cursor) {
      const decoded = decodeReviewCursor(input.cursor);
      if (decoded) {
        const cursorFilter: Prisma.QuestionWhereInput = {
          OR: [
            { createdAt: { lt: decoded.createdAt } },
            {
              AND: [
                { createdAt: decoded.createdAt },
                { id: { lt: decoded.id } },
              ],
            },
          ],
        };

        where.AND = [
          ...(Array.isArray(where.AND)
            ? where.AND
            : where.AND
              ? [where.AND]
              : []),
          cursorFilter,
        ];
      }
    }

    const rows = await questionModel(this.database).findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      select: QUESTION_SELECT,
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

  async countByStatusForShop(shopId: string): Promise<QuestionStatusCounts> {
    const rows = await questionModel(this.database).groupBy({
      by: ["status"],
      where: { shopId },
      _count: { _all: true },
    });

    const counts: QuestionStatusCounts = {
      PENDING: 0,
      PUBLISHED: 0,
      HIDDEN: 0,
      ANSWERED: 0,
    };

    for (const row of rows) {
      counts[row.status] = row._count._all;
    }

    return counts;
  }

  async updateForShop(
    shopId: string,
    questionId: string,
    input: UpdateQuestionRecordInput,
  ): Promise<QuestionRecord | null> {
    const existing = await this.findByIdForShop(shopId, questionId);
    if (!existing) {
      return null;
    }

    return questionModel(this.database).update({
      where: { id: questionId },
      data: input,
      select: QUESTION_SELECT,
    });
  }

  async deleteForShop(shopId: string, questionId: string): Promise<boolean> {
    const existing = await this.findByIdForShop(shopId, questionId);
    if (!existing) {
      return false;
    }

    await questionModel(this.database).delete({ where: { id: questionId } });
    return true;
  }

  async findForCustomerPrivacy(
    shopId: string,
    match: QuestionCustomerMatchInput,
  ): Promise<QuestionRecord[]> {
    if (!match.email) {
      return [];
    }

    return questionModel(this.database).findMany({
      where: {
        shopId,
        email: { equals: match.email, mode: "insensitive" },
      },
      select: QUESTION_SELECT,
    });
  }

  async redactCustomerPii(
    shopId: string,
    match: QuestionCustomerMatchInput,
  ): Promise<number> {
    if (!match.email) {
      return 0;
    }

    const result = await questionModel(this.database).updateMany({
      where: {
        shopId,
        email: { equals: match.email, mode: "insensitive" },
      },
      data: {
        customerName: "Redacted",
        email: "redacted@example.com",
      },
    });

    return result.count;
  }
}

export const questionRepository = new PrismaQuestionRepository();
