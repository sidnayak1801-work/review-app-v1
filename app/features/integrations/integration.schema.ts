import { z } from "zod";

export const integrationProviderIdSchema = z.enum(["klaviyo", "gorgias"]);

export const connectKlaviyoSchema = z.object({
  provider: z.literal("klaviyo"),
  apiKey: z.string().trim().min(10).max(200),
});

export const connectGorgiasSchema = z.object({
  provider: z.literal("gorgias"),
  email: z.string().trim().email().max(320),
  apiToken: z.string().trim().min(8).max(200),
  subdomain: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+(\.gorgias\.com)?$/, "Invalid Gorgias subdomain"),
});

export const connectIntegrationSchema = z.discriminatedUnion("provider", [
  connectKlaviyoSchema,
  connectGorgiasSchema,
]);

export const integrationProviderActionSchema = z.object({
  provider: integrationProviderIdSchema,
});
