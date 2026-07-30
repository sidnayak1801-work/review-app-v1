import { z } from "zod";

export const UNINSTALL_REASON_CODES = [
  "testing_multiple_apps",
  "store_closing_or_pausing",
  "not_using_app_now",
  "not_satisfied_features",
  "not_satisfied_support",
  "too_expensive",
  "not_working_with_store",
  "other",
] as const;

export type UninstallReasonCode = (typeof UNINSTALL_REASON_CODES)[number];

export const UNINSTALL_REASON_LABELS: Record<UninstallReasonCode, string> = {
  testing_multiple_apps: "Testing multiple apps",
  store_closing_or_pausing: "Store is closing or pausing",
  not_using_app_now: "Not using app now",
  not_satisfied_features: "Not satisfied with app features",
  not_satisfied_support: "Not satisfied with customer support",
  too_expensive: "Too expensive",
  not_working_with_store: "Not working properly with store",
  other: "Other (please specify)",
};

export const UNINSTALL_DETAILS_MAX = 250;

const reasonCodeSchema = z.enum(UNINSTALL_REASON_CODES);

export const submitUninstallFeedbackSchema = z
  .object({
    reasons: z
      .array(reasonCodeSchema)
      .min(1, "Select at least one reason")
      .superRefine((reasons, context) => {
        const unique = new Set(reasons);
        if (unique.size !== reasons.length) {
          context.addIssue({
            code: "custom",
            message: "Duplicate reasons are not allowed",
          });
        }
      }),
    details: z
      .string()
      .trim()
      .max(UNINSTALL_DETAILS_MAX)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .superRefine((data, context) => {
    if (data.reasons.includes("other") && !data.details) {
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Please share a short note when selecting Other",
      });
    }
  });

export type SubmitUninstallFeedbackInput = z.output<
  typeof submitUninstallFeedbackSchema
>;

/** Parse FormData reason fields (`reasons` repeated or comma-joined). */
export function reasonsFromFormData(formData: FormData): string[] {
  const multi = formData
    .getAll("reasons")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (multi.length > 0) {
    return multi;
  }
  const joined = String(formData.get("reasons") ?? "").trim();
  if (!joined) {
    return [];
  }
  return joined
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
