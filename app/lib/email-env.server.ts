import {
  createConsoleEmailProvider,
  createResendEmailProvider,
} from "../services/email-provider.resend.server";
import type { EmailProvider } from "../services/email-provider.server";

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.EMAIL_FROM?.trim();

  if (apiKey && fromAddress) {
    return createResendEmailProvider({ apiKey, fromAddress });
  }

  return createConsoleEmailProvider();
}

export function getReviewRequestEmailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() ?? "reviews@example.com";
}

export function getAppBaseUrl(): string {
  const appUrl = process.env.SHOPIFY_APP_URL?.trim();

  if (!appUrl) {
    throw new Error("SHOPIFY_APP_URL is required for review-request links.");
  }

  return appUrl.replace(/\/$/, "");
}
