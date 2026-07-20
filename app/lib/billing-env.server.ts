import { z } from "zod";

import { parseWithSchema } from "./validation";

const billingEnvSchema = z.object({
  BILLING_TEST_MODE: z
    .preprocess(
      (value) => value === "true" || value === "1",
      z.boolean(),
    )
    .default(false),
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

export function isBillingTestMode(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return getBillingEnv(environment).BILLING_TEST_MODE;
}
