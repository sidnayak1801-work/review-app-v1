import { describe, expect, it } from "vitest";

import { buildEmbeddedAdminUrl } from "./embedded-admin-url";

describe("buildEmbeddedAdminUrl", () => {
  it("builds the admin-hosted URL for a page inside the app", () => {
    expect(
      buildEmbeddedAdminUrl({
        shopDomain: "demo.myshopify.com",
        apiKey: "abc123",
        path: "/app/billing",
      }),
    ).toBe("https://admin.shopify.com/store/demo/apps/abc123/app/billing");
  });

  it("returns the app root when no path is given", () => {
    expect(
      buildEmbeddedAdminUrl({
        shopDomain: "demo.myshopify.com",
        apiKey: "abc123",
      }),
    ).toBe("https://admin.shopify.com/store/demo/apps/abc123");
  });

  it("accepts a path without a leading slash", () => {
    expect(
      buildEmbeddedAdminUrl({
        shopDomain: "demo.myshopify.com",
        apiKey: "abc123",
        path: "app/billing",
      }),
    ).toBe("https://admin.shopify.com/store/demo/apps/abc123/app/billing");
  });

  it("never points at the app origin", () => {
    // An app-origin return URL is what caused Shopify's reviewer to land on an
    // App Bridge bootstrap page served with HTTP 200.
    const url = buildEmbeddedAdminUrl({
      shopDomain: "demo.myshopify.com",
      apiKey: "abc123",
      path: "/app/billing",
    });

    expect(new URL(url).origin).toBe("https://admin.shopify.com");
  });

  it("only strips the myshopify suffix from the end of the domain", () => {
    expect(
      buildEmbeddedAdminUrl({
        shopDomain: "my-myshopify-com-store.myshopify.com",
        apiKey: "abc123",
      }),
    ).toBe(
      "https://admin.shopify.com/store/my-myshopify-com-store/apps/abc123",
    );
  });
});
