/**
 * Build a public media URL from the durable S3/local object key.
 * Prefer this over reading a stored absolute URL so CDN/bucket host changes
 * only require updating MEDIA_PUBLIC_BASE_URL.
 */
export function buildPublicMediaUrl(
  storageKey: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const key = storageKey.trim().replace(/^\/+/, "");
  if (!key) {
    return "";
  }

  const publicBase = environment.MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  // Local disk: path-only, then rewrite onto current app/tunnel origin.
  return resolvePublicMediaUrl(`/api/media/${key}`, environment);
}

/**
 * Local disk media URLs embed the tunnel host at upload time. After
 * `shopify app dev` restarts, rewrite `/api/media/...` paths to the current
 * app origin so admin and storefront thumbs keep working.
 */
export function resolvePublicMediaUrl(
  url: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  const marker = "/api/media/";
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex === -1) {
    return trimmed;
  }

  const mediaPath = trimmed.slice(markerIndex);
  const base =
    environment.SHOPIFY_APP_URL?.trim() ||
    environment.MEDIA_PUBLIC_BASE_URL?.trim() ||
    "";

  if (!base) {
    return mediaPath;
  }

  return `${base.replace(/\/$/, "")}${mediaPath}`;
}
