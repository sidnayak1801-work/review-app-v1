import { z } from "zod";

import { shopifyProductIdSchema } from "../reviews/review.schema";

export const questionStatusSchema = z.enum([
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "ANSWERED",
]);

export const createStorefrontQuestionSchema = z.object({
  shopifyProductId: shopifyProductIdSchema,
  customerName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  question: z.string().trim().min(1).max(2000),
  productTitle: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  website: z.string().optional().default(""),
});

export const listQuestionsQuerySchema = z.object({
  status: questionStatusSchema.optional(),
  shopifyProductId: shopifyProductIdSchema.optional(),
  q: z.string().trim().max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listPublicQuestionsQuerySchema = z.object({
  shopifyProductId: shopifyProductIdSchema,
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(3),
});

export const updateQuestionStatusSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN", "PENDING", "ANSWERED"]),
});

export const setQuestionAnswerSchema = z.object({
  answer: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => (value.length > 0 ? value : null)),
});
