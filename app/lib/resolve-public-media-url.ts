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
