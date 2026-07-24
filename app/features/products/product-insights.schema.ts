import { z } from "zod";

export const productIdParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) =>
      /^\d+$/.test(value) || /^gid:\/\/shopify\/Product\/\d+$/.test(value),
    "Invalid product id",
  );

export const productDetailQuerySchema = z.object({
  cursor: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
