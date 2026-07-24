import { describe, expect, it } from "vitest";

import { widgetSettingsSchema } from "./widget-settings.schema";
import {
  assertMediaLimits,
  MAX_IMAGES_PER_REVIEW,
} from "../reviews/review-media.service.server";
import type { ReviewMediaRecord } from "../../repositories/review-media.repository.server";
import { ValidationError } from "../../lib/domain-error";

describe("widgetSettingsSchema", () => {
  it("accepts expanded settings from form-like values", () => {
    const parsed = widgetSettingsSchema.parse({
      widgetEnabled: "true",
      accentColor: "#112233",
      primaryButtonColor: "#445566",
      starColor: "#22c55e",
      borderRadius: "12",
      cardShadow: "true",
      layout: "GRID",
      showCustomerName: "true",
      showReviewDate: "false",
      showProductImages: "on",
      showCustomerPhotos: "true",
      autoPublishReviews: "false",
      darkMode: "false",
      showReviewForm: "true",
      reviewsPerPage: "20",
    });

    expect(parsed.layout).toBe("GRID");
    expect(parsed.borderRadius).toBe(12);
    expect(parsed.showReviewDate).toBe(false);
    expect(parsed.reviewsPerPage).toBe(20);
  });

  it("rejects invalid reviews per page", () => {
    expect(() =>
      widgetSettingsSchema.parse({
        widgetEnabled: true,
        accentColor: "#112233",
        primaryButtonColor: "#445566",
        starColor: "#22c55e",
        borderRadius: 8,
        cardShadow: true,
        layout: "STACKED",
        showCustomerName: true,
        showReviewDate: true,
        showProductImages: false,
        showCustomerPhotos: true,
        autoPublishReviews: false,
        darkMode: false,
        showReviewForm: true,
        reviewsPerPage: 7,
      }),
    ).toThrow();
  });
});

describe("assertMediaLimits", () => {
  function media(
    kind: "IMAGE" | "VIDEO",
    id: string,
  ): ReviewMediaRecord {
    return {
      id,
      shopId: "shop-1",
      reviewId: null,
      kind,
      storageKey: `${id}.bin`,
      url: `https://cdn.example/${id}`,
      mimeType: kind === "IMAGE" ? "image/jpeg" : "video/mp4",
      sizeBytes: 1000,
      width: null,
      height: null,
      position: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it("allows up to five images and one video", () => {
    expect(() =>
      assertMediaLimits([
        media("IMAGE", "1"),
        media("IMAGE", "2"),
        media("IMAGE", "3"),
        media("IMAGE", "4"),
        media("IMAGE", "5"),
        media("VIDEO", "v1"),
      ]),
    ).not.toThrow();
  });

  it("rejects too many images", () => {
    const items = Array.from({ length: MAX_IMAGES_PER_REVIEW + 1 }, (_, i) =>
      media("IMAGE", String(i)),
    );
    expect(() => assertMediaLimits(items)).toThrow(ValidationError);
  });
});
