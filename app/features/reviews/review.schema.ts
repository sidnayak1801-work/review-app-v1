import { z } from "zod";

import {
  normalizeShopifyProductId,
} from "../../lib/shopify-ids";

export const reviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const reviewSourceSchema = z.enum([
  "STOREFRONT",
  "MERCHANT",
  "IMPORT",
]);

export const shopifyProductIdSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, context) => {
    try {
      return normalizeShopifyProductId(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "Must be a Shopify product ID or GID",
      });
      return z.NEVER;
    }
  });

export const createMerchantReviewSchema = z.object({
  shopifyProductId: shopifyProductIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional().or(z.literal("")).transform((value) => value || undefined),
  body: z.string().trim().min(1).max(5000),
  authorName: z.string().trim().min(1).max(100),
  authorEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  status: reviewStatusSchema.default("APPROVED"),
  verifiedPurchase: z.coerce.boolean().default(false),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),
  body: z.string().trim().min(1).max(5000).optional(),
  authorName: z.string().trim().min(1).max(100).optional(),
  authorEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),
  status: reviewStatusSchema.optional(),
  verifiedPurchase: z.coerce.boolean().optional(),
});

export const listReviewsQuerySchema = z.object({
  status: reviewStatusSchema.optional(),
  shopifyProductId: shopifyProductIdSchema.optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createStorefrontReviewSchema = z.object({
  shopifyProductId: shopifyProductIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  body: z.string().trim().min(1).max(5000),
  authorName: z.string().trim().min(1).max(100),
  authorEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  website: z.string().optional().default(""),
});

export const listStorefrontReviewsQuerySchema = z.object({
  shopifyProductId: shopifyProductIdSchema,
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type CreateMerchantReviewInput = z.output<
  typeof createMerchantReviewSchema
>;
export type UpdateReviewInput = z.output<typeof updateReviewSchema>;
