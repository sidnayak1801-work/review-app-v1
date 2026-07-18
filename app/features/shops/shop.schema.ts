import { z } from "zod";

export const shopDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,
    "Must be a valid myshopify.com domain",
  );

export const shopifyShopIdSchema = z
  .string()
  .trim()
  .regex(
    /^gid:\/\/shopify\/Shop\/\d+$/,
    "Must be a valid Shopify Shop GID",
  );

export const createShopSchema = z.object({
  shopDomain: shopDomainSchema,
  shopifyShopId: shopifyShopIdSchema.optional(),
});

export const installShopSchema = createShopSchema;

export type CreateShopInput = z.output<typeof createShopSchema>;
export type InstallShopInput = z.output<typeof installShopSchema>;
