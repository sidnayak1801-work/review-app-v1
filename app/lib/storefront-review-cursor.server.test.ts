import { describe, expect, it } from "vitest";

import {
  decodeStorefrontReviewCursor,
  encodeStorefrontReviewCursor,
} from "./storefront-review-cursor.server";
import { encodeReviewCursor } from "./shopify-ids";

describe("storefront review cursor", () => {
  it("round-trips a versioned sort cursor", () => {
    const encoded = encodeStorefrontReviewCursor({
      v: 1,
      sort: "highest_rating",
      createdAt: "2026-07-18T00:00:00.000Z",
      id: "review-1",
      rating: 5,
    });

    expect(decodeStorefrontReviewCursor(encoded, "highest_rating")).toEqual({
      v: 1,
      sort: "highest_rating",
      createdAt: "2026-07-18T00:00:00.000Z",
      id: "review-1",
      rating: 5,
      hasImage: undefined,
      hasVideo: undefined,
    });
  });

  it("rejects cursors whose sort does not match the active sort", () => {
    const encoded = encodeStorefrontReviewCursor({
      v: 1,
      sort: "highest_rating",
      createdAt: "2026-07-18T00:00:00.000Z",
      id: "review-1",
      rating: 5,
    });

    expect(decodeStorefrontReviewCursor(encoded, "most_recent")).toBeNull();
  });

  it("accepts legacy createdAt|id cursors only for most_recent", () => {
    const legacy = encodeReviewCursor(
      new Date("2026-07-18T00:00:00.000Z"),
      "review-1",
    );

    expect(decodeStorefrontReviewCursor(legacy, "most_recent")).toMatchObject({
      sort: "most_recent",
      id: "review-1",
      createdAt: "2026-07-18T00:00:00.000Z",
    });
    expect(decodeStorefrontReviewCursor(legacy, "highest_rating")).toBeNull();
  });
});
