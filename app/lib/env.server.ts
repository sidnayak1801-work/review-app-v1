import { z } from "zod";

import { parseWithSchema } from "./validation";

const postgresUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  }, "Must be a PostgreSQL connection URL");

const databaseEnvSchema = z.object({
  DATABASE_URL: postgresUrlSchema,
  DIRECT_URL: postgresUrlSchema,
  TEST_DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    postgresUrlSchema.optional(),
  ),
});

const shopifyEnvSchema = z.object({
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_APP_URL: z.string().url(),
  SCOPES: z.string().default(""),
  SHOP_CUSTOM_DOMAIN: z.string().optional(),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type ShopifyEnv = z.infer<typeof shopifyEnvSchema>;

export function getDatabaseEnv(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseEnv {
  return parseWithSchema(
    databaseEnvSchema,
    environment,
    "Invalid database environment",
  );
}

export function getShopifyEnv(
  environment: NodeJS.ProcessEnv = process.env,
): ShopifyEnv {
  return parseWithSchema(
    shopifyEnvSchema,
    environment,
    "Invalid Shopify environment",
  );
}
