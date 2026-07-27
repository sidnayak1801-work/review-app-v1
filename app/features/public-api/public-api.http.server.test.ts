import { afterEach, describe, expect, it, vi } from "vitest";

import { DomainError } from "../../lib/domain-error";
import {
  handlePublicApi,
  publicApiJson,
} from "./public-api.http.server";
import { InMemoryRateLimiter } from "./public-api.rate-limit.server";

vi.mock("./api-token.service.server", () => ({
  apiTokenService: {
    authenticateBearer: vi.fn(),
  },
}));

import { apiTokenService } from "./api-token.service.server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handlePublicApi", () => {
  it("returns 401 when authentication fails", async () => {
    vi.mocked(apiTokenService.authenticateBearer).mockRejectedValue(
      new DomainError("Invalid or revoked API token.", "UNAUTHORIZED"),
    );

    const response = await handlePublicApi(
      new Request("https://example.com/api/v1/reviews"),
      async () => publicApiJson({ ok: true }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("applies rate-limit headers on success", async () => {
    vi.mocked(apiTokenService.authenticateBearer).mockResolvedValue({
      shop: {
        id: "shop-1",
        shopDomain: "example.myshopify.com",
        shopifyShopId: null,
        plan: "FREE",
        status: "INSTALLED",
        installedAt: new Date(),
        uninstalledAt: null,
        billingStatus: null,
        billingSyncedAt: null,
      },
      token: {
        id: "tok-1",
        shopId: "shop-1",
        name: "Test",
        tokenPrefix: "abcd1234",
        tokenHash: "hash",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const limiter = new InMemoryRateLimiter();
    const response = await handlePublicApi(
      new Request("https://example.com/api/v1/reviews", {
        headers: { Authorization: "Bearer rvw_test" },
      }),
      async () => publicApiJson({ items: [] }),
      { rateLimiter: limiter },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(apiTokenService.authenticateBearer).mockResolvedValue({
      shop: {
        id: "shop-1",
        shopDomain: "example.myshopify.com",
        shopifyShopId: null,
        plan: "FREE",
        status: "INSTALLED",
        installedAt: new Date(),
        uninstalledAt: null,
        billingStatus: null,
        billingSyncedAt: null,
      },
      token: {
        id: "tok-rl",
        shopId: "shop-1",
        name: "Test",
        tokenPrefix: "abcd1234",
        tokenHash: "hash",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const limiter = new InMemoryRateLimiter();
    const policyKeyRequest = new Request(
      "https://example.com/api/v1/reviews",
      { headers: { Authorization: "Bearer rvw_test" } },
    );

    // Exhaust a custom low limit by swapping consume via many calls with
    // a one-request policy — use assert path by exhausting default after
    // temporarily replacing limiter behavior.
    const consume = vi.spyOn(limiter, "consume");
    consume.mockResolvedValue({
      allowed: false,
      limit: 1,
      remaining: 0,
      resetAt: Math.ceil(Date.now() / 1000) + 60,
    });

    const response = await handlePublicApi(
      policyKeyRequest,
      async () => publicApiJson({ items: [] }),
      { rateLimiter: limiter },
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
