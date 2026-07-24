const PRODUCT_GID_PREFIX = "gid://shopify/Product/";

export function normalizeShopifyProductId(value: string): string {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return `${PRODUCT_GID_PREFIX}${trimmed}`;
  }

  if (/^gid:\/\/shopify\/Product\/\d+$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error("Invalid Shopify product ID");
}

export function toShopifyProductNumericId(productGid: string): string {
  const trimmed = productGid.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(PRODUCT_GID_PREFIX, "");
}

function toProductNumericIdOrNull(productId: string): string | null {
  try {
    const normalized = /^\d+$/.test(productId.trim())
      ? productId.trim()
      : normalizeShopifyProductId(productId);
    const numericId = toShopifyProductNumericId(normalized);
    return /^\d+$/.test(numericId) ? numericId : null;
  } catch {
    return null;
  }
}

/** In-app product insights dashboard path. */
export function toAppProductHref(productId: string): string | null {
  const numericId = toProductNumericIdOrNull(productId);
  return numericId ? `/app/products/${numericId}` : null;
}

/** Embedded Admin deep link for a product. */
export function toShopifyAdminProductHref(productId: string): string | null {
  const numericId = toProductNumericIdOrNull(productId);
  return numericId ? `shopify://admin/products/${numericId}` : null;
}

export function encodeReviewCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, "utf8").toString(
    "base64url",
  );
}

export function decodeReviewCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = decoded.lastIndexOf("|");

    if (separator <= 0) {
      return null;
    }

    const createdAt = new Date(decoded.slice(0, separator));
    const id = decoded.slice(separator + 1);

    if (Number.isNaN(createdAt.getTime()) || !id) {
      return null;
    }

    return { createdAt, id };
  } catch {
    return null;
  }
}
