import { z } from "zod";

export const widgetSettingsSchema = z.object({
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #111111"),
  showReviewForm: z.coerce.boolean(),
  reviewsPerPage: z.coerce.number().int().min(1).max(20),
});

export type WidgetSettingsInput = z.output<typeof widgetSettingsSchema>;
