import {
  IntegrationProviderError,
  type ConnectionTestResult,
  type DecryptedCredentials,
  type IntegrationEventContext,
  type IntegrationProvider,
  type SmsContext,
} from "./integration-provider.server";

const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-10-15";

function requireApiKey(credentials: DecryptedCredentials): string {
  const apiKey = credentials.apiKey?.trim();
  if (!apiKey) {
    throw new IntegrationProviderError(
      "Klaviyo API key is required.",
      "KLAVIYO_API_KEY_REQUIRED",
    );
  }
  return apiKey;
}

async function klaviyoFetch(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${KLAVIYO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision: KLAVIYO_REVISION,
      ...(init?.headers ?? {}),
    },
  });
}

async function createEvent(
  apiKey: string,
  input: {
    metricName: string;
    email: string;
    properties: Record<string, unknown>;
    uniqueId: string;
  },
): Promise<void> {
  const response = await klaviyoFetch(apiKey, "/events/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          properties: input.properties,
          metric: {
            data: {
              type: "metric",
              attributes: { name: input.metricName },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: input.email,
              },
            },
          },
          unique_id: input.uniqueId,
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new IntegrationProviderError(
      `Klaviyo event failed (${response.status}): ${detail.slice(0, 200)}`,
      "KLAVIYO_EVENT_FAILED",
    );
  }
}

export class KlaviyoProvider implements IntegrationProvider {
  readonly id = "klaviyo" as const;
  readonly displayName = "Klaviyo";

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<ConnectionTestResult> {
    try {
      const apiKey = requireApiKey(credentials);
      const response = await klaviyoFetch(apiKey, "/accounts/");
      if (!response.ok) {
        return {
          ok: false,
          errorMessage: `Klaviyo rejected the API key (${response.status}).`,
        };
      }

      const payload = (await response.json()) as {
        data?: Array<{ attributes?: { contact_information?: { organization_name?: string } } }>;
      };
      const label =
        payload.data?.[0]?.attributes?.contact_information?.organization_name;

      return {
        ok: true,
        ...(label ? { accountLabel: label } : { accountLabel: "Klaviyo account" }),
      };
    } catch (error) {
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : "Klaviyo connection failed.",
      };
    }
  }

  async handleEvent(ctx: IntegrationEventContext): Promise<void> {
    const apiKey = requireApiKey(ctx.credentials);
    const event = ctx.event;

    if (event.type === "review.published") {
      const email = event.data.authorEmail?.trim();
      if (!email) {
        return;
      }
      await createEvent(apiKey, {
        metricName: "Review Published",
        email,
        uniqueId: `review-published-${event.data.reviewId}`,
        properties: {
          reviewId: event.data.reviewId,
          shopifyProductId: event.data.shopifyProductId,
          productTitle: event.data.productTitle ?? undefined,
          rating: event.data.rating,
          title: event.data.title ?? undefined,
          body: event.data.body,
          authorName: event.data.authorName,
          verifiedBuyer: event.data.verifiedBuyer,
          adminUrl: event.data.adminUrl,
        },
      });
      return;
    }

    if (event.type === "review_request.sent") {
      await createEvent(apiKey, {
        metricName: "Review Request Sent",
        email: event.data.customerEmail,
        uniqueId: `review-request-sent-${event.data.reviewRequestId}`,
        properties: {
          reviewRequestId: event.data.reviewRequestId,
          shopifyOrderId: event.data.shopifyOrderId,
          shopifyProductId: event.data.shopifyProductId,
        },
      });
      return;
    }

    if (event.type === "review_request.completed") {
      await createEvent(apiKey, {
        metricName: "Review Request Completed",
        email: event.data.customerEmail,
        uniqueId: `review-request-completed-${event.data.reviewRequestId}`,
        properties: {
          reviewRequestId: event.data.reviewRequestId,
          reviewId: event.data.reviewId,
          shopifyProductId: event.data.shopifyProductId,
        },
      });
    }
  }

  async sendSms(_ctx: SmsContext): Promise<void> {
    // Placeholder for future Klaviyo SMS support.
    throw new IntegrationProviderError(
      "Klaviyo SMS is not implemented yet.",
      "KLAVIYO_SMS_NOT_IMPLEMENTED",
    );
  }
}

export const klaviyoProvider = new KlaviyoProvider();
