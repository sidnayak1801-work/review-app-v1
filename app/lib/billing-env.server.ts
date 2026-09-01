import { z } from "zod";

import { isDevelopmentStore } from "../services/shopify-shop-plan.server";
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
 * Decide whether a Shopify charge must be created as a test charge.
 *
 * `BILLING_TEST_MODE` wins when set. Otherwise the store type decides:
 * development stores cannot process real transactions, so charges there must be
 * test charges. This is how Shopify app reviewers evaluate paid plans, so
 * keying off `NODE_ENV` alone makes the Pro plan untestable in review.
 *
 * Falls back to the deployment environment only when the store type cannot be
 * resolved.
 */
export async function resolveChargeTestMode(
  admin: Parameters<typeof isDevelopmentStore>[0],
  environment: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const configured = getBillingEnv(environment).BILLING_TEST_MODE;

  if (configured !== undefined) {
    return configured;
  }

  const developmentStore = await isDevelopmentStore(admin);

  if (developmentStore !== null) {
    return developmentStore;
  }

  return environment.NODE_ENV !== "production";
}
