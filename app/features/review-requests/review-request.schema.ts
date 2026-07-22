import { z } from "zod";

import { normalizeShopifyProductId } from "../../lib/shopify-ids";

export const DEFAULT_REVIEW_REQUEST_DELAY_DAYS = 3;
export const MAX_REVIEW_REQUEST_ATTEMPTS = 3;
export const REVIEW_REQUEST_BATCH_SIZE = 50;
export const FREE_MAX_PRODUCTS_IN_EMAIL = 5;

const orderLineItemSchema = z.object({
  product_id: z.union([z.number(), z.string(), z.null()]).optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
});

export const orderFulfilledWebhookSchema = z.object({
  id: z.union([z.number(), z.string()]),
  admin_graphql_api_id: z.string().optional(),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  contact_email: z.string().email().optional(),
  customer: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
  shipping_address: z
    .object({
      country_code: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable()
    .optional(),
  billing_address: z
    .object({
      country_code: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable()
    .optional(),
  line_items: z.array(orderLineItemSchema).default([]),
});

export type OrderFulfilledWebhookPayload = z.infer<
  typeof orderFulfilledWebhookSchema
>;

export function resolveOrderId(payload: OrderFulfilledWebhookPayload): string {
  if (payload.admin_graphql_api_id) {
    return payload.admin_graphql_api_id;
  }

  return String(payload.id);
}

export function resolveCustomerEmail(
  payload: OrderFulfilledWebhookPayload,
): string | null {
  return (
    payload.email ??
    payload.contact_email ??
    payload.customer?.email ??
    null
  );
}

export function resolveShippingCountryCode(
  payload: OrderFulfilledWebhookPayload,
): string | null {
  const raw =
    payload.shipping_address?.country_code ??
    payload.billing_address?.country_code ??
    null;

  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function extractProductIdsFromOrder(
  payload: OrderFulfilledWebhookPayload,
): string[] {
  const productIds = new Set<string>();

  for (const lineItem of payload.line_items) {
    if (lineItem.product_id === null || lineItem.product_id === undefined) {
      continue;
    }

    try {
      productIds.add(normalizeShopifyProductId(String(lineItem.product_id)));
    } catch {
      continue;
    }
  }

  return [...productIds];
}

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Must be a 2-letter country code");

export const updateReviewRequestSettingsSchema = z.object({
  requestDelayDays: z.coerce.number().int().min(1).max(14),
  domesticDelayDays: z.coerce.number().int().min(1).max(30),
  internationalDelayDays: z.coerce.number().int().min(1).max(30),
  homeCountryCode: countryCodeSchema,
  emailSubject: z.string().trim().min(1).max(200),
  emailBodyHtml: z.string().trim().min(1).max(20_000),
  reminderEnabled: z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean(),
  ),
  reminderDelayDays: z.coerce.number().int().min(1).max(14),
  reminderSubject: z.string().trim().min(1).max(200),
  reminderBodyHtml: z.string().trim().min(1).max(20_000),
});

export type UpdateReviewRequestSettingsInput = z.infer<
  typeof updateReviewRequestSettingsSchema
>;

export const reviewRequestSubmissionSchema = z.object({
  token: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(5000),
  authorName: z.string().trim().min(1).max(100),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
});

export type ReviewRequestSubmissionInput = z.infer<
  typeof reviewRequestSubmissionSchema
>;

/** @deprecated Use DEFAULT_REVIEW_REQUEST_DELAY_DAYS */
export const REVIEW_REQUEST_DELAY_DAYS = DEFAULT_REVIEW_REQUEST_DELAY_DAYS;
