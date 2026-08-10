import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/env.server", () => ({
  getShopifyEnv: () => ({
    SHOPIFY_API_KEY: "test-api-key",
    SHOPIFY_API_SECRET: "test-secret",
    SHOPIFY_APP_URL: "https://example.com",
    SCOPES: "",
  }),
}));

import {
  themeAppEmbedEditorUrl,
  themeNumericId,
} from "./onboarding-theme.server";

describe("themeNumericId", () => {
  it("parses OnlineStoreTheme GIDs", () => {
    expect(themeNumericId("gid://shopify/OnlineStoreTheme/1234567890")).toBe(
      "1234567890",
    );
  });

  it("accepts raw numeric ids", () => {
    expect(themeNumericId("42")).toBe("42");
  });

  it("rejects unknown values", () => {
    expect(themeNumericId("not-a-theme")).toBeNull();
  });
});

describe("themeAppEmbedEditorUrl", () => {
  it("deep-links a specific theme when id is provided", () => {
    const url = themeAppEmbedEditorUrl(
      "example.myshopify.com",
      "gid://shopify/OnlineStoreTheme/99",
    );
    expect(url).toContain("/admin/themes/99/editor");
    expect(url).not.toContain("themes/current");
  });

  it("falls back to current theme when id is missing", () => {
    const url = themeAppEmbedEditorUrl("example.myshopify.com");
    expect(url).toContain("/admin/themes/current/editor");
  });
});
