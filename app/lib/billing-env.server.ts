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
 * Development stores always get test charges, even when production sets
 * `BILLING_TEST_MODE=false`. Live charges on a dev store require a payment
 * method and leave Shopify's Approve button disabled, which blocks App Store
 * review. Only after confirming the store is not a development store does
 * `BILLING_TEST_MODE` or `NODE_ENV` apply.
 */
export async function resolveChargeTestContext(
  admin: Parameters<typeof isDevelopmentStore>[0],
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{ isTest: boolean; partnerDevelopment: boolean | null }> {
  const partnerDevelopment = await isDevelopmentStore(admin);

  if (partnerDevelopment === true) {
    return { isTest: true, partnerDevelopment };
  }

  const configured = getBillingEnv(environment).BILLING_TEST_MODE;

  if (configured !== undefined) {
    return { isTest: configured, partnerDevelopment };
  }

  if (partnerDevelopment === false) {
    return { isTest: false, partnerDevelopment };
  }

  return {
    isTest: environment.NODE_ENV !== "production",
    partnerDevelopment,
  };
}

export async function resolveChargeTestMode(
  admin: Parameters<typeof isDevelopmentStore>[0],
  environment: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const { isTest } = await resolveChargeTestContext(admin, environment);
  return isTest;
}
