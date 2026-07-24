import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #111111");

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "on" || value === "true" || value === "1") {
    return true;
  }
  if (value === "off" || value === "false" || value === "0" || value === null || value === undefined || value === "") {
    return false;
  }
  return value;
}, z.boolean());

export const widgetLayoutSchema = z.enum(["STACKED", "COMPACT", "GRID"]);

export const widgetSettingsSchema = z.object({
  widgetEnabled: booleanFromForm,
  accentColor: hexColor,
  primaryButtonColor: hexColor,
  starColor: hexColor,
  borderRadius: z.coerce.number().int().min(0).max(20),
  cardShadow: booleanFromForm,
  layout: widgetLayoutSchema,
  showCustomerName: booleanFromForm,
  showReviewDate: booleanFromForm,
  showProductImages: booleanFromForm,
  showCustomerPhotos: booleanFromForm,
  autoPublishReviews: booleanFromForm,
  darkMode: booleanFromForm,
  showReviewForm: booleanFromForm,
  reviewsPerPage: z.coerce
    .number()
    .int()
    .refine((value) => [5, 10, 20, 50].includes(value), {
      message: "Reviews per page must be 5, 10, 20, or 50",
    }),
});

export type WidgetSettingsInput = z.output<typeof widgetSettingsSchema>;

export function widgetSettingsToPublic(settings: WidgetSettingsInput) {
  return settings;
}
