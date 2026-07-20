import { z } from "zod";

import { reviewStatusSchema } from "../reviews/review.schema";
import { normalizeShopifyProductId } from "../../lib/shopify-ids";

export const REQUIRED_IMPORT_HEADERS = [
  "product_id",
  "rating",
  "body",
  "author_name",
] as const;

export const MAX_IMPORT_FILE_BYTES = 1_024 * 1_024;
export const MAX_IMPORT_ROWS = 500;
export const IMPORT_BATCH_SIZE = 50;

export const importRowSchema = z.object({
  product_id: z
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
    }),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(5000),
  author_name: z.string().trim().min(1).max(100),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  author_email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  status: reviewStatusSchema.default("PENDING"),
  verified_purchase: z
    .preprocess((value) => {
      if (value === "" || value === undefined) {
        return false;
      }

      if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }

      return value;
    }, z.boolean())
    .default(false),
});

export type ImportRowInput = z.output<typeof importRowSchema>;

export function validateImportHeaders(headers: string[]): string[] {
  const missing = REQUIRED_IMPORT_HEADERS.filter(
    (header) => !headers.includes(header),
  );

  return missing;
}
