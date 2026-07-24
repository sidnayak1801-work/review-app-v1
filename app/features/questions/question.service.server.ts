import {
  questionRepository,
  type QuestionRecord,
  type QuestionRepository,
  type QuestionStatus,
  type QuestionStatusCounts,
} from "../../repositories/question.repository.server";
import { NotFoundError, ValidationError } from "../../lib/domain-error";
import { logger } from "../../services/logger.server";
import {
  createStorefrontQuestionSchema,
  listPublicQuestionsQuerySchema,
  listQuestionsQuerySchema,
  setQuestionAnswerSchema,
  updateQuestionStatusSchema,
} from "./question.schema";
import { notifyMerchantOfNewQuestion } from "./question-notify.server";

function parseOrThrow<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  data: unknown,
  message: string,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(
      message,
      parsed.error.issues.map((issue) => issue.message),
    );
  }
  return parsed.data;
}

function toPublicQuestion(question: QuestionRecord) {
  return {
    id: question.id,
    shopifyProductId: question.shopifyProductId,
    customerName: question.customerName,
    question: question.question,
    answer: question.answer,
    status: question.status,
    answeredAt: question.answeredAt?.toISOString() ?? null,
    publishedAt: question.publishedAt?.toISOString() ?? null,
    createdAt: question.createdAt.toISOString(),
  };
}

function toAdminQuestion(question: QuestionRecord) {
  return {
    ...toPublicQuestion(question),
    email: question.email,
    productTitle: question.productTitle,
    updatedAt: question.updatedAt.toISOString(),
  };
}

export class QuestionService {
  constructor(private readonly questions: QuestionRepository) {}

  async listForShop(shopId: string, rawQuery: unknown) {
    const query = parseOrThrow(
      listQuestionsQuerySchema,
      rawQuery,
      "Invalid question list query",
    );

    const result = await this.questions.list({
      shopId,
      status: query.status,
      shopifyProductId: query.shopifyProductId,
      query: query.q,
      cursor: query.cursor,
      limit: query.limit,
    });

    return {
      items: result.items.map(toAdminQuestion),
      pageInfo: result.pageInfo,
    };
  }

  async getStatusCountsForShop(shopId: string): Promise<QuestionStatusCounts> {
    return this.questions.countByStatusForShop(shopId);
  }

  async listPublicForStorefront(shopId: string, rawQuery: unknown) {
    const query = parseOrThrow(
      listPublicQuestionsQuerySchema,
      rawQuery,
      "Invalid public question list query",
    );

    const result = await this.questions.list({
      shopId,
      shopifyProductId: query.shopifyProductId,
      statuses: ["PUBLISHED", "ANSWERED"],
      cursor: query.cursor,
      limit: query.limit,
    });

    return {
      items: result.items.map(toPublicQuestion),
      pageInfo: result.pageInfo,
    };
  }

  async createStorefrontQuestion(
    shopId: string,
    shopDomain: string,
    rawInput: unknown,
  ) {
    const data = parseOrThrow(
      createStorefrontQuestionSchema,
      rawInput,
      "Invalid question",
    );

    if (data.website) {
      throw new ValidationError("Spam check failed", ["Spam check failed"]);
    }

    const created = await this.questions.create({
      shopId,
      shopifyProductId: data.shopifyProductId,
      productTitle: data.productTitle ?? null,
      customerName: data.customerName,
      email: data.email,
      question: data.question,
      status: "PENDING",
    });

    logger.info("Storefront question submitted", {
      shopId,
      questionId: created.id,
    });

    void notifyMerchantOfNewQuestion({
      shopDomain,
      question: created,
    });

    return toPublicQuestion(created);
  }

  async updateStatus(
    shopId: string,
    questionId: string,
    rawInput: unknown,
  ): Promise<QuestionRecord> {
    const data = parseOrThrow(
      updateQuestionStatusSchema,
      rawInput,
      "Invalid status update",
    );

    const existing = await this.questions.findByIdForShop(shopId, questionId);
    if (!existing) {
      throw new NotFoundError("Question not found");
    }

    const nextStatus = data.status as QuestionStatus;
    const publishedAt =
      (nextStatus === "PUBLISHED" || nextStatus === "ANSWERED") &&
      !existing.publishedAt
        ? new Date()
        : existing.publishedAt;

    const updated = await this.questions.updateForShop(shopId, questionId, {
      status: nextStatus,
      publishedAt,
    });

    if (!updated) {
      throw new NotFoundError("Question not found");
    }

    logger.info("Question status updated", {
      shopId,
      questionId,
      status: updated.status,
    });

    return updated;
  }

  async setAnswer(
    shopId: string,
    questionId: string,
    rawInput: unknown,
  ): Promise<QuestionRecord> {
    const data = parseOrThrow(
      setQuestionAnswerSchema,
      rawInput,
      "Invalid answer",
    );

    const existing = await this.questions.findByIdForShop(shopId, questionId);
    if (!existing) {
      throw new NotFoundError("Question not found");
    }

    const answeredAt = data.answer ? new Date() : null;
    let nextStatus: QuestionStatus = existing.status;

    if (data.answer) {
      if (existing.status !== "HIDDEN") {
        nextStatus = "ANSWERED";
      }
    } else if (existing.status === "ANSWERED") {
      nextStatus = "PUBLISHED";
    }

    const publishedAt =
      (nextStatus === "PUBLISHED" || nextStatus === "ANSWERED") &&
      !existing.publishedAt
        ? new Date()
        : existing.publishedAt;

    const updated = await this.questions.updateForShop(shopId, questionId, {
      answer: data.answer,
      answeredAt,
      status: nextStatus,
      publishedAt,
    });

    if (!updated) {
      throw new NotFoundError("Question not found");
    }

    logger.info("Question answer updated", {
      shopId,
      questionId,
      hasAnswer: Boolean(updated.answer),
      status: updated.status,
    });

    return updated;
  }

  async delete(shopId: string, questionId: string): Promise<void> {
    const deleted = await this.questions.deleteForShop(shopId, questionId);
    if (!deleted) {
      throw new NotFoundError("Question not found");
    }

    logger.info("Question deleted", { shopId, questionId });
  }

  async getForShop(shopId: string, questionId: string): Promise<QuestionRecord> {
    const question = await this.questions.findByIdForShop(shopId, questionId);
    if (!question) {
      throw new NotFoundError("Question not found");
    }
    return question;
  }
}

export const questionService = new QuestionService(questionRepository);
