import { describe, expect, it } from "vitest";

import {
  buildPublicMediaUrl,
  resolvePublicMediaUrl,
} from "./resolve-public-media-url";

describe("buildPublicMediaUrl", () => {
  it("joins MEDIA_PUBLIC_BASE_URL with the storage key", () => {
    expect(
      buildPublicMediaUrl("shops/1/reviews/a.webp", {
        MEDIA_PUBLIC_BASE_URL: "https://cdn.example.com/",
      }),
    ).toBe("https://cdn.example.com/shops/1/reviews/a.webp");
  });

  it("strips a leading slash from the key", () => {
    expect(
      buildPublicMediaUrl("/shops/1/reviews/a.webp", {
        MEDIA_PUBLIC_BASE_URL: "https://cdn.example.com",
      }),
    ).toBe("https://cdn.example.com/shops/1/reviews/a.webp");
  });

  it("uses /api/media for local disk when no public base is set", () => {
    expect(buildPublicMediaUrl("shops/1/reviews/a.webp", {})).toBe(
      "/api/media/shops/1/reviews/a.webp",
    );
  });

  it("rewrites local media onto SHOPIFY_APP_URL when present", () => {
    expect(
      buildPublicMediaUrl("shops/1/reviews/a.webp", {
        SHOPIFY_APP_URL: "https://tunnel.trycloudflare.com",
      }),
    ).toBe("https://tunnel.trycloudflare.com/api/media/shops/1/reviews/a.webp");
  });
});

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
