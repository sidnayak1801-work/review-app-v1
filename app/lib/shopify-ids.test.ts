import { describe, expect, it } from "vitest";

import {
  decodeReviewCursor,
  encodeReviewCursor,
  normalizeShopifyProductId,
  toAppProductHref,
  toShopifyAdminProductHref,
  toShopifyProductNumericId,
} from "./shopify-ids";

describe("shopify-ids helpers", () => {
  it("normalizes numeric and GID product ids", () => {
    expect(normalizeShopifyProductId("123")).toBe("gid://shopify/Product/123");
    expect(normalizeShopifyProductId("gid://shopify/Product/456")).toBe(
      "gid://shopify/Product/456",
    );
  });

  it("builds admin and in-app product links", () => {
    expect(toShopifyProductNumericId("gid://shopify/Product/998")).toBe("998");
    expect(toShopifyAdminProductHref("gid://shopify/Product/998")).toBe(
      "shopify://admin/products/998",
    );
    expect(toShopifyAdminProductHref("998")).toBe(
      "shopify://admin/products/998",
    );
    expect(toAppProductHref("gid://shopify/Product/998")).toBe(
      "/app/products/998",
    );
    expect(toAppProductHref("998")).toBe("/app/products/998");
  });

  it("round-trips review cursors", () => {
    const createdAt = new Date("2026-07-18T10:00:00.000Z");
    const cursor = encodeReviewCursor(createdAt, "review_1");
    expect(decodeReviewCursor(cursor)).toEqual({
      createdAt,
      id: "review_1",
    });
  });
});
