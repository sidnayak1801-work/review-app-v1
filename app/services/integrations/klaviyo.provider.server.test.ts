import { afterEach, describe, expect, it, vi } from "vitest";

import { KlaviyoProvider } from "./klaviyo.provider.server";

describe("KlaviyoProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts Review Published events when email is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new KlaviyoProvider();
    await provider.handleEvent({
      shopId: "shop_1",
      credentials: { apiKey: "pk_live_test" },
      event: {
        type: "review.published",
        data: {
          reviewId: "r1",
          shopifyProductId: "p1",
          rating: 5,
          body: "Great",
          authorName: "Ada",
          authorEmail: "ada@example.com",
          verifiedBuyer: true,
        },
      },
      saveExternalRef: vi.fn(),
      findExternalRef: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as {
      data: { attributes: { metric: { data: { attributes: { name: string } } } } };
    };
    expect(body.data.attributes.metric.data.attributes.name).toBe(
      "Review Published",
    );
  });

  it("skips published events without email", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = new KlaviyoProvider();
    await provider.handleEvent({
      shopId: "shop_1",
      credentials: { apiKey: "pk_live_test" },
      event: {
        type: "review.published",
        data: {
          reviewId: "r1",
          shopifyProductId: "p1",
          rating: 5,
          body: "Great",
          authorName: "Ada",
          verifiedBuyer: false,
        },
      },
      saveExternalRef: vi.fn(),
      findExternalRef: vi.fn(),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
