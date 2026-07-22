import { z } from "zod";

import { parseWithSchema } from "./validation";

const billingEnvSchema = z.object({
  BILLING_TEST_MODE: z
    .preprocess((value) => {
      if (value === undefined || value === "") {
        return undefined;
      }

      return value === "true" || value === "1";
    }, z.boolean().optional()),
});

export type BillingEnv = z.infer<typeof billingEnvSchema>;

export function getBillingEnv(
  environment: NodeJS.ProcessEnv = process.env,
): BillingEnv {
  return parseWithSchema(
    billingEnvSchema,
    environment,
    "Invalid billing environment",
  );
}

/**
 * Use test charges when explicitly enabled, or automatically outside production
 * so local/dev stores can complete Shopify billing approval.
 */
export function isBillingTestMode(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const configured = getBillingEnv(environment).BILLING_TEST_MODE;

  if (configured !== undefined) {
    return configured;
  }

  return environment.NODE_ENV !== "production";
}
