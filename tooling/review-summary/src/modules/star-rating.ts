const STAR_PATH =
  "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z";

let halfGradientSeq = 0;

function starSvg(kind: "full" | "half" | "empty"): string {
  if (kind === "half") {
    halfGradientSeq += 1;
    const gradientId = `rx-half-${halfGradientSeq}`;
    return `<svg class="rx-stars__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${gradientId}">
          <stop offset="50%" stop-color="currentColor"/>
          <stop offset="50%" stop-color="currentColor" stop-opacity="0.28"/>
        </linearGradient>
      </defs>
      <path fill="url(#${gradientId})" d="${STAR_PATH}"/>
    </svg>`;
  }

  const emptyClass = kind === "empty" ? " rx-stars__icon--empty" : "";
  return `<svg class="rx-stars__icon${emptyClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="${STAR_PATH}"/>
  </svg>`;
}

/** Renders full / half / empty stars for an average rating (0–5). */
export function renderStarRating(
  averageRating: number | null,
  options: { labelPrefix?: string } = {},
): string {
  const value =
    averageRating == null || Number.isNaN(averageRating)
      ? 0
      : Math.max(0, Math.min(5, averageRating));

  const stars: string[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const diff = value - (i - 1);
    if (diff >= 0.75) {
      stars.push(starSvg("full"));
    } else if (diff >= 0.25) {
      stars.push(starSvg("half"));
    } else {
      stars.push(starSvg("empty"));
    }
  }

  const label = `${options.labelPrefix ?? "Rated"} ${value.toFixed(1)} out of 5`;
  return `<span class="rx-stars" role="img" aria-label="${escapeAttr(label)}">${stars.join("")}</span>`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
