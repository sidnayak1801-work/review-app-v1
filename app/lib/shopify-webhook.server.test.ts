import { describe, expect, it, vi } from "vitest";

import {
  authenticateShopifyWebhook,
  webhookMethodNotAllowedResponse,
  webhookUnauthorizedResponse,
} from "./shopify-webhook.server";

describe("authenticateShopifyWebhook", () => {
  const request = new Request("https://example.com/webhooks/compliance", {
    method: "POST",
    body: "{}",
  });

  it("passes through a verified webhook context", async () => {
    const context = { shop: "hmac-check.myshopify.com", topic: "SHOP_REDACT" };
    const authenticateWebhook = vi.fn().mockResolvedValue(context);

    const result = await authenticateShopifyWebhook(
      authenticateWebhook,
      request,
    );

    expect(result).toEqual({ ok: true, data: context });
    expect(authenticateWebhook).toHaveBeenCalledWith(request);
  });

  it("returns 401 when HMAC validation throws 401", async () => {
    const authenticateWebhook = vi.fn().mockRejectedValue(
      new Response(undefined, { status: 401, statusText: "Unauthorized" }),
    );

    const result = await authenticateShopifyWebhook(
      authenticateWebhook,
      request,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(401);
    expect(await result.response.text()).toBe("Unauthorized");
  });

  it("maps missing-HMAC 400 responses to 401", async () => {
    const authenticateWebhook = vi.fn().mockRejectedValue(
      new Response(undefined, { status: 400, statusText: "Bad Request" }),
    );

    const result = await authenticateShopifyWebhook(
      authenticateWebhook,
      request,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(401);
    expect(await result.response.text()).toBe("Unauthorized");
  });

  it("returns 405 for non-POST webhook requests", async () => {
    const authenticateWebhook = vi.fn().mockRejectedValue(
      new Response(undefined, {
        status: 405,
        statusText: "Method not allowed",
      }),
    );

    const result = await authenticateShopifyWebhook(
      authenticateWebhook,
      request,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(405);
    expect(await result.response.text()).toBe("Method not allowed");
  });

  it("returns 401 when verification throws a non-Response error", async () => {
    const authenticateWebhook = vi
      .fn()
      .mockRejectedValue(new Error("validation failed"));

    const result = await authenticateShopifyWebhook(
      authenticateWebhook,
      request,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.response.status).toBe(401);
  });
});

describe("webhook method responses", () => {
  it("builds a 405 GET rejection", async () => {
    const response = webhookMethodNotAllowedResponse();
    expect(response.status).toBe(405);
    expect(await response.text()).toBe("Method not allowed");
  });

  it("builds a 401 HMAC rejection", async () => {
    const response = webhookUnauthorizedResponse();
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });
});
