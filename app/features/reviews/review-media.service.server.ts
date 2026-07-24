import { randomUUID } from "node:crypto";

import { resolvePublicMediaUrl } from "../../lib/resolve-public-media-url";
import { ValidationError } from "../../lib/domain-error";
import { parseWithSchema } from "../../lib/validation";
import {
  reviewMediaRepository,
  type ReviewMediaKind,
  type ReviewMediaRecord,
  type ReviewMediaRepository,
} from "../../repositories/review-media.repository.server";
import {
  mediaStorage,
  type MediaStorage,
} from "../../services/media-storage.server";
import { logger } from "../../services/logger.server";
import { z } from "zod";

export const MAX_IMAGES_PER_REVIEW = 5;
export const MAX_VIDEOS_PER_REVIEW = 1;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

const mediaIdsSchema = z.array(z.string().trim().min(1)).max(6);

function resolveMimeType(mimeType: string, fileName?: string): string {
  const cleaned = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    IMAGE_MIME_TYPES.has(cleaned) ||
    VIDEO_MIME_TYPES.has(cleaned)
  ) {
    return cleaned;
  }

  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = EXT_MIME[ext];
  if (fromExt) {
    return fromExt;
  }

  return cleaned;
}

function kindFromMime(mimeType: string): ReviewMediaKind {
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return "IMAGE";
  }
  if (VIDEO_MIME_TYPES.has(mimeType)) {
    return "VIDEO";
  }
  throw new ValidationError("Unsupported media type", [
    "Only JPEG, PNG, WebP, GIF, MP4, WebM, and MOV are allowed.",
  ]);
}

function assertSize(kind: ReviewMediaKind, sizeBytes: number): void {
  const max = kind === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (sizeBytes <= 0 || sizeBytes > max) {
    throw new ValidationError("File too large", [
      kind === "IMAGE"
        ? "Images must be 10 MB or smaller."
        : "Videos must be 10 MB or smaller.",
    ]);
  }
}

export function assertMediaLimits(media: ReviewMediaRecord[]): void {
  const images = media.filter((item) => item.kind === "IMAGE").length;
  const videos = media.filter((item) => item.kind === "VIDEO").length;

  if (images > MAX_IMAGES_PER_REVIEW) {
    throw new ValidationError("Too many images", [
      `A review can include up to ${MAX_IMAGES_PER_REVIEW} images.`,
    ]);
  }

  if (videos > MAX_VIDEOS_PER_REVIEW) {
    throw new ValidationError("Too many videos", [
      `A review can include up to ${MAX_VIDEOS_PER_REVIEW} video.`,
    ]);
  }
}

export function toPublicMedia(media: ReviewMediaRecord) {
  return {
    id: media.id,
    kind: media.kind,
    url: resolvePublicMediaUrl(media.url),
    mimeType: media.mimeType,
    position: media.position,
  };
}

export class ReviewMediaService {
  constructor(
    private readonly media: ReviewMediaRepository,
    private readonly storage: MediaStorage,
  ) {}

  async uploadForShop(
    shopId: string,
    file: {
      bytes: Buffer;
      mimeType: string;
      fileName?: string;
    },
  ): Promise<ReviewMediaRecord> {
    const mimeType = resolveMimeType(file.mimeType, file.fileName);
    const kind = kindFromMime(mimeType);
    assertSize(kind, file.bytes.byteLength);

    const extension =
      mimeType === "image/jpeg"
        ? "jpg"
        : mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : mimeType === "image/gif"
              ? "gif"
              : mimeType === "video/webm"
                ? "webm"
                : mimeType === "video/quicktime"
                  ? "mov"
                  : "mp4";

    const key = `shops/${shopId}/reviews/${randomUUID()}.${extension}`;
    const stored = await this.storage.putObject({
      key,
      body: file.bytes,
      contentType: mimeType,
    });

    const record = await this.media.create({
      shopId,
      reviewId: null,
      kind,
      storageKey: stored.key,
      url: stored.url,
      mimeType,
      sizeBytes: file.bytes.byteLength,
    });

    logger.info("Review media uploaded", {
      shopId,
      mediaId: record.id,
      kind: record.kind,
      sizeBytes: record.sizeBytes,
    });

    return record;
  }

  async resolveForAttach(
    shopId: string,
    mediaIdsUnknown: unknown,
  ): Promise<ReviewMediaRecord[]> {
    const mediaIds = parseWithSchema(
      mediaIdsSchema,
      mediaIdsUnknown ?? [],
      "Invalid media ids",
    );

    if (mediaIds.length === 0) {
      return [];
    }

    const records = await this.media.findByIdsForShop(shopId, mediaIds);
    if (records.length !== mediaIds.length) {
      throw new ValidationError("Invalid media", [
        "One or more media files were not found for this shop.",
      ]);
    }

    const unattached = records.filter((item) => item.reviewId == null);
    if (unattached.length !== records.length) {
      throw new ValidationError("Invalid media", [
        "Media files are already attached to another review.",
      ]);
    }

    assertMediaLimits(records);
    return records;
  }

  async attachToReview(
    shopId: string,
    reviewId: string,
    mediaIds: string[],
  ): Promise<void> {
    await this.media.attachToReview(shopId, reviewId, mediaIds);
  }

  async listForReviews(shopId: string, reviewIds: string[]) {
    const records = await this.media.listForReviews(shopId, reviewIds);
    return records.map(toPublicMedia);
  }

  async listGroupedForReviews(shopId: string, reviewIds: string[]) {
    const records = await this.media.listForReviews(shopId, reviewIds);
    const grouped = new Map<string, ReturnType<typeof toPublicMedia>[]>();
    for (const record of records) {
      if (!record.reviewId) {
        continue;
      }
      const list = grouped.get(record.reviewId) ?? [];
      list.push(toPublicMedia(record));
      grouped.set(record.reviewId, list);
    }
    return grouped;
  }
}

export const reviewMediaService = new ReviewMediaService(
  reviewMediaRepository,
  mediaStorage,
);
