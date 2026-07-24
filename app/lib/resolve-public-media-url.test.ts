import { describe, expect, it } from "vitest";

import { resolvePublicMediaUrl } from "./resolve-public-media-url";

describe("resolvePublicMediaUrl", () => {
  it("rewrites stale tunnel hosts to the current app URL", () => {
    expect(
      resolvePublicMediaUrl(
        "https://old-tunnel.trycloudflare.com/api/media/shops/1/a.jpg",
        { SHOPIFY_APP_URL: "https://new-tunnel.trycloudflare.com" },
      ),
    ).toBe("https://new-tunnel.trycloudflare.com/api/media/shops/1/a.jpg");
  });

  it("returns path-only when no app URL is configured", () => {
    expect(
      resolvePublicMediaUrl(
        "https://old.example/api/media/shops/1/a.jpg",
        {},
      ),
    ).toBe("/api/media/shops/1/a.jpg");
  });

  it("leaves non-local media URLs unchanged", () => {
    expect(
      resolvePublicMediaUrl("https://cdn.example.com/reviews/a.jpg", {
        SHOPIFY_APP_URL: "https://app.example.com",
      }),
    ).toBe("https://cdn.example.com/reviews/a.jpg");
  });
});
