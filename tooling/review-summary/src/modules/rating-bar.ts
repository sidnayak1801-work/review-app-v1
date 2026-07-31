export function ratingPercentage(count: number, totalReviews: number): number {
  if (totalReviews <= 0) return 0;
  return Math.round((count / totalReviews) * 100);
}

/** One distribution row: label, progress bar, percentage. */
export function renderRatingBar(input: {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  totalReviews: number;
}): string {
  const pct = ratingPercentage(input.count, input.totalReviews);
  const label = `${input.stars} star`;

  return `<div class="rx-bar">
    <span class="rx-bar__label">${label}</span>
    <div
      class="rx-bar__track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="${pct}"
      aria-label="${label}: ${pct} percent"
    >
      <span class="rx-bar__fill"></span>
    </div>
    <span class="rx-bar__pct">${pct}%</span>
  </div>`;
}
