import { describe, expect, it } from "vitest";

import {
  decodeReviewCursor,
  encodeReviewCursor,
  normalizeShopifyProductId,
} from "./shopify-ids";

describe("shopify-ids helpers", () => {
  it("normalizes numeric and GID product ids", () => {
    expect(normalizeShopifyProductId("123")).toBe("gid://shopify/Product/123");
    expect(normalizeShopifyProductId("gid://shopify/Product/456")).toBe(
      "gid://shopify/Product/456",
    );
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
