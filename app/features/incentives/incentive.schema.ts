import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .transform((value, context) => {
    if (!value) {
      return null;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        context.addIssue({
          code: "custom",
          message: "Referral URL must start with http:// or https://",
        });
        return z.NEVER;
      }
      return parsed.toString();
    } catch {
      context.addIssue({
        code: "custom",
        message: "Referral URL must be a valid URL",
      });
      return z.NEVER;
    }
  });

function formBoolean(defaultValue = false) {
  return z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "on" || normalized === "1") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "") {
        return false;
      }
    }
    if (value == null) {
      return defaultValue;
    }
    return value;
  }, z.boolean());
}

export const upsertPostReviewIncentiveSchema = z
  .object({
    enabled: formBoolean(false),
    thankYouTitle: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .default("Thanks for your review!"),
    thankYouBody: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .default(
        "Thanks for your review! We are processing it and it will appear on the store once approved.",
      ),
    couponEnabled: formBoolean(false),
    couponCode: optionalTrimmed,
    couponHeadline: optionalTrimmed,
    couponDescription: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.length > 0 ? value : null)),
    referralEnabled: formBoolean(false),
    referralMessage: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.length > 0 ? value : null)),
    referralCtaLabel: optionalTrimmed,
    referralCtaUrl: optionalUrl,
  })
  .superRefine((data, context) => {
    if (data.couponEnabled && !data.couponCode) {
      context.addIssue({
        code: "custom",
        path: ["couponCode"],
        message: "Coupon code is required when coupon reward is enabled.",
      });
    }
    if (data.referralEnabled && !data.referralMessage) {
      context.addIssue({
        code: "custom",
        path: ["referralMessage"],
        message: "Referral message is required when referral prompt is enabled.",
      });
    }
  });

export type UpsertPostReviewIncentiveInput = z.output<
  typeof upsertPostReviewIncentiveSchema
>;
