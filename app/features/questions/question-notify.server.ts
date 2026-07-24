import {
  getEmailProvider,
  getReviewRequestEmailFromAddress,
} from "../../lib/email-env.server";
import { logger } from "../../services/logger.server";
import type { EmailProvider } from "../../services/email-provider.server";
import { unauthenticated } from "../../shopify.server";
import type { QuestionRecord } from "../../repositories/question.repository.server";

const SHOP_EMAIL_QUERY = `#graphql
  query ShopContactEmail {
    shop {
      email
      contactEmail
      name
    }
  }
`;

interface ShopEmailResponse {
  data?: {
    shop?: {
      email?: string | null;
      contactEmail?: string | null;
      name?: string | null;
    };
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveMerchantEmail(
  shopDomain: string,
): Promise<{ to: string; shopName: string } | null> {
  try {
    const { admin } = await unauthenticated.admin(shopDomain);
    const response = await admin.graphql(SHOP_EMAIL_QUERY);
    const payload = (await response.json()) as ShopEmailResponse;
    const shop = payload.data?.shop;
    const to = (shop?.email || shop?.contactEmail || "").trim();
    if (!to) {
      return null;
    }
    return {
      to,
      shopName: shop?.name?.trim() || shopDomain,
    };
  } catch (error) {
    logger.warn("Unable to resolve merchant email for Q&A notification", {
      shopDomain,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

export async function notifyMerchantOfNewQuestion(input: {
  shopDomain: string;
  question: QuestionRecord;
  emailProvider?: EmailProvider;
}): Promise<void> {
  const merchant = await resolveMerchantEmail(input.shopDomain);
  if (!merchant) {
    logger.info("Skipped Q&A merchant notification; no shop email", {
      shopDomain: input.shopDomain,
      questionId: input.question.id,
    });
    return;
  }

  const productLabel =
    input.question.productTitle?.trim() || input.question.shopifyProductId;
  const provider = input.emailProvider ?? getEmailProvider();
  const from = getReviewRequestEmailFromAddress();

  const html = `
    <p>A customer asked a new product question on <strong>${escapeHtml(merchant.shopName)}</strong>.</p>
    <p><strong>Product:</strong> ${escapeHtml(productLabel)}</p>
    <p><strong>From:</strong> ${escapeHtml(input.question.customerName)} &lt;${escapeHtml(input.question.email)}&gt;</p>
    <p><strong>Question:</strong></p>
    <p>${escapeHtml(input.question.question)}</p>
    <p>Open your app’s Q&amp;A page to approve, answer, or hide this question.</p>
  `;

  try {
    await provider.sendEmail({
      to: merchant.to,
      subject: `New product question: ${productLabel}`.slice(0, 200),
      html,
    });
    logger.info("Q&A merchant notification sent", {
      shopDomain: input.shopDomain,
      questionId: input.question.id,
      fromConfigured: Boolean(from),
    });
  } catch (error) {
    logger.warn("Q&A merchant notification failed", {
      shopDomain: input.shopDomain,
      questionId: input.question.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
