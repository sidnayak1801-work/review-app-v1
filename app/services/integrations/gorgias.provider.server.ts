import {
  IntegrationProviderError,
  type ConnectionTestResult,
  type DecryptedCredentials,
  type IntegrationEventContext,
  type IntegrationProvider,
  type SyncReplyContext,
} from "./integration-provider.server";

function requireGorgiasCredentials(credentials: DecryptedCredentials): {
  email: string;
  apiToken: string;
  subdomain: string;
} {
  const email = credentials.email?.trim();
  const apiToken = credentials.apiToken?.trim();
  const subdomain = credentials.subdomain?.trim().replace(/\.gorgias\.com$/i, "");

  if (!email || !apiToken || !subdomain) {
    throw new IntegrationProviderError(
      "Gorgias email, API token, and subdomain are required.",
      "GORGIAS_CREDENTIALS_REQUIRED",
    );
  }

  return { email, apiToken, subdomain };
}

function gorgiasBaseUrl(subdomain: string): string {
  return `https://${subdomain}.gorgias.com/api`;
}

function authHeader(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

async function gorgiasFetch(
  credentials: DecryptedCredentials,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { email, apiToken, subdomain } = requireGorgiasCredentials(credentials);
  return fetch(`${gorgiasBaseUrl(subdomain)}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(email, apiToken),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export class GorgiasProvider implements IntegrationProvider {
  readonly id = "gorgias" as const;
  readonly displayName = "Gorgias";

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<ConnectionTestResult> {
    try {
      const response = await gorgiasFetch(credentials, "/account");
      if (!response.ok) {
        return {
          ok: false,
          errorMessage: `Gorgias rejected the credentials (${response.status}).`,
        };
      }

      const payload = (await response.json()) as {
        domain?: string;
        name?: string;
      };

      return {
        ok: true,
        accountLabel: payload.domain || payload.name || "Gorgias account",
      };
    } catch (error) {
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : "Gorgias connection failed.",
      };
    }
  }

  async handleEvent(ctx: IntegrationEventContext): Promise<void> {
    if (ctx.event.type === "review.published") {
      const created = await this.createSupportTicket({
        shopId: ctx.shopId,
        credentials: ctx.credentials,
        review: ctx.event.data,
      });

      await ctx.saveExternalRef({
        entityType: "REVIEW",
        entityId: ctx.event.data.reviewId,
        externalId: created.externalId,
        externalType: "TICKET",
      });
      return;
    }

    if (ctx.event.type === "review.merchant_reply") {
      const ticketId = await ctx.findExternalRef({
        entityType: "REVIEW",
        entityId: ctx.event.data.reviewId,
        externalType: "TICKET",
      });
      if (!ticketId) {
        return;
      }

      await this.syncMerchantReply({
        shopId: ctx.shopId,
        credentials: ctx.credentials,
        ticketExternalId: ticketId,
        reply: ctx.event.data,
      });
    }
  }

  async createSupportTicket(input: {
    shopId: string;
    credentials: DecryptedCredentials;
    review: {
      reviewId: string;
      shopifyProductId: string;
      productTitle?: string | null;
      rating: number;
      title?: string | null;
      body: string;
      authorName: string;
      authorEmail?: string | null;
      adminUrl?: string;
    };
  }): Promise<{ externalId: string }> {
    const subject = `Review ${input.review.rating}/5 — ${
      input.review.productTitle?.trim() || input.review.shopifyProductId
    }`;
    const messageBody = [
      `Customer: ${input.review.authorName}`,
      input.review.authorEmail ? `Email: ${input.review.authorEmail}` : null,
      `Rating: ${input.review.rating}/5`,
      input.review.title ? `Title: ${input.review.title}` : null,
      "",
      input.review.body,
      input.review.adminUrl ? `\nAdmin: ${input.review.adminUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const customerPayload = input.review.authorEmail
      ? {
          email: input.review.authorEmail,
          name: input.review.authorName,
        }
      : {
          name: input.review.authorName,
        };

    const response = await gorgiasFetch(input.credentials, "/tickets", {
      method: "POST",
      body: JSON.stringify({
        customer: customerPayload,
        channel: "api",
        via: "api",
        subject,
        messages: [
          {
            channel: "api",
            via: "api",
            from_agent: false,
            body_text: messageBody,
          },
        ],
        meta: {
          review_id: input.review.reviewId,
          shopify_product_id: input.review.shopifyProductId,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new IntegrationProviderError(
        `Gorgias ticket create failed (${response.status}): ${detail.slice(0, 200)}`,
        "GORGIAS_TICKET_FAILED",
      );
    }

    const payload = (await response.json()) as { id?: number | string };
    if (payload.id === undefined || payload.id === null) {
      throw new IntegrationProviderError(
        "Gorgias ticket create returned no id.",
        "GORGIAS_TICKET_MISSING_ID",
      );
    }

    return { externalId: String(payload.id) };
  }

  async syncMerchantReply(ctx: SyncReplyContext): Promise<void> {
    const response = await gorgiasFetch(
      ctx.credentials,
      `/tickets/${encodeURIComponent(ctx.ticketExternalId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          channel: "api",
          via: "api",
          from_agent: true,
          body_text: ctx.reply.merchantReply,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new IntegrationProviderError(
        `Gorgias reply sync failed (${response.status}): ${detail.slice(0, 200)}`,
        "GORGIAS_REPLY_SYNC_FAILED",
      );
    }
  }
}

export const gorgiasProvider = new GorgiasProvider();
