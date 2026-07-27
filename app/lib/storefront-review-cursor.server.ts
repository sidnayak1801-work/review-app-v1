import type { StorefrontReviewSort } from "../features/reviews/review.schema";

export type StorefrontReviewCursorPayload = {
  v: 1;
  sort: StorefrontReviewSort;
  createdAt: string;
  id: string;
  rating?: number;
  hasImage?: boolean;
  hasVideo?: boolean;
};

export function encodeStorefrontReviewCursor(
  payload: StorefrontReviewCursorPayload,
): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeStorefrontReviewCursor(
  cursor: string,
  expectedSort: StorefrontReviewSort,
): StorefrontReviewCursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");

    // Legacy createdAt|id cursors only apply to most_recent.
    if (!decoded.startsWith("{")) {
      if (expectedSort !== "most_recent") {
        return null;
      }
      const separator = decoded.lastIndexOf("|");
      if (separator <= 0) {
        return null;
      }
      const createdAt = new Date(decoded.slice(0, separator));
      const id = decoded.slice(separator + 1);
      if (Number.isNaN(createdAt.getTime()) || !id) {
        return null;
      }
      return {
        v: 1,
        sort: "most_recent",
        createdAt: createdAt.toISOString(),
        id,
      };
    }

    const parsed = JSON.parse(decoded) as Partial<StorefrontReviewCursorPayload>;
    if (
      parsed.v !== 1 ||
      parsed.sort !== expectedSort ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string" ||
      !parsed.id
    ) {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      v: 1,
      sort: parsed.sort,
      createdAt: createdAt.toISOString(),
      id: parsed.id,
      rating:
        typeof parsed.rating === "number" && Number.isFinite(parsed.rating)
          ? parsed.rating
          : undefined,
      hasImage:
        typeof parsed.hasImage === "boolean" ? parsed.hasImage : undefined,
      hasVideo:
        typeof parsed.hasVideo === "boolean" ? parsed.hasVideo : undefined,
    };
  } catch {
    return null;
  }
}
