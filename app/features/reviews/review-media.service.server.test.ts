import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../lib/domain-error";
import type { MediaStorage } from "../../services/media-storage.server";
import {
  assertMediaLimits,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_REVIEW,
  MAX_VIDEO_BYTES,
  ReviewMediaService,
} from "./review-media.service.server";

function mediaRecord(
  overrides: Partial<{
    id: string;
    kind: "IMAGE" | "VIDEO";
    reviewId: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "m1",
    shopId: "shop1",
    reviewId: overrides.reviewId ?? null,
    kind: overrides.kind ?? ("IMAGE" as const),
    storageKey: "key",
    url: "https://example.com/x.webp",
    mimeType: "image/webp",
    sizeBytes: 100,
    position: 0,
    createdAt: new Date(),
  };
}

describe("assertMediaLimits", () => {
  it("allows up to 5 images and 1 video", () => {
    const items = [
      ...Array.from({ length: MAX_IMAGES_PER_REVIEW }, (_, i) =>
        mediaRecord({ id: `i${i}`, kind: "IMAGE" }),
      ),
      mediaRecord({ id: "v1", kind: "VIDEO" }),
    ];
    expect(() => assertMediaLimits(items)).not.toThrow();
  });

  it("rejects more than 5 images", () => {
    const items = Array.from({ length: MAX_IMAGES_PER_REVIEW + 1 }, (_, i) =>
      mediaRecord({ id: `i${i}`, kind: "IMAGE" }),
    );
    expect(() => assertMediaLimits(items)).toThrow(ValidationError);
  });
});

describe("ReviewMediaService.uploadForShop", () => {
  it("accepts WebP by MIME and stores under 10 MB", async () => {
    const storage: MediaStorage = {
      isConfigured: () => true,
      putObject: vi.fn(async ({ key }) => ({
        key,
        url: `https://cdn.example/${key}`,
      })),
    };
    const create = vi.fn(async (input: unknown) => ({
      ...(input as object),
      id: "media-1",
      position: 0,
      createdAt: new Date(),
    }));

    const service = new ReviewMediaService(
      {
        create,
        findByIdsForShop: vi.fn(),
        attachToReview: vi.fn(),
        listForReviews: vi.fn(),
      } as never,
      storage,
    );

    const bytes = Buffer.alloc(1024, 1);
    const record = await service.uploadForShop("shop1", {
      bytes,
      mimeType: "image/webp",
      fileName: "photo.webp",
    });

    expect(record.kind).toBe("IMAGE");
    expect(storage.putObject).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/webp",
        kind: "IMAGE",
      }),
    );
  });

  it("infers WebP from filename when browser MIME is empty", async () => {
    const storage: MediaStorage = {
      isConfigured: () => true,
      putObject: vi.fn(async ({ key }) => ({
        key,
        url: `https://cdn.example/${key}`,
      })),
    };
    const create = vi.fn(async (input: unknown) => ({
      ...(input as object),
      id: "media-2",
      position: 0,
      createdAt: new Date(),
    }));

    const service = new ReviewMediaService(
      {
        create,
        findByIdsForShop: vi.fn(),
        attachToReview: vi.fn(),
        listForReviews: vi.fn(),
      } as never,
      storage,
    );

    await service.uploadForShop("shop1", {
      bytes: Buffer.from("webp"),
      mimeType: "",
      fileName: "shot.WEBP",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/webp", kind: "IMAGE" }),
    );
  });

  it("rejects files over 10 MB", async () => {
    const service = new ReviewMediaService(
      {
        create: vi.fn(),
        findByIdsForShop: vi.fn(),
        attachToReview: vi.fn(),
        listForReviews: vi.fn(),
      } as never,
      {
        isConfigured: () => true,
        putObject: vi.fn(),
      },
    );

    await expect(
      service.uploadForShop("shop1", {
        bytes: Buffer.alloc(MAX_IMAGE_BYTES + 1),
        mimeType: "image/webp",
        fileName: "big.webp",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      service.uploadForShop("shop1", {
        bytes: Buffer.alloc(MAX_VIDEO_BYTES + 1),
        mimeType: "video/mp4",
        fileName: "big.mp4",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
