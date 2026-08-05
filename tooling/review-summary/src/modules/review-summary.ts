import { fetchProductSummary, type ProductSummaryResponse } from "../api/summary";
import { renderStarRating } from "./star-rating";
import { RatingPopover } from "./rating-popover";
import { bindScrollButton, scrollToReviewsSection } from "./review-scroll";

export type ReviewSummarySettings = {
  showStars: boolean;
  showAverage: boolean;
  showCount: boolean;
  showSeeAll: boolean;
  enableAnimations: boolean;
};

function parseBool(value: string | null, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "true" || value === "1";
}

function readSettings(root: HTMLElement): ReviewSummarySettings {
  return {
    showStars: parseBool(root.dataset.showStars, true),
    showAverage: parseBool(root.dataset.showAverage, true),
    showCount: parseBool(root.dataset.showCount, true),
    showSeeAll: parseBool(root.dataset.showSeeAll, true),
    enableAnimations: parseBool(root.dataset.enableAnimations, true),
  };
}

/** Amazon-style count with reviews label: (13 reviews) */
function formatCount(total: number): string {
  const label = total === 1 ? "review" : "reviews";
  return `(${total.toLocaleString()} ${label})`;
}

export class ReviewSummary {
  private summary: ProductSummaryResponse | null = null;

  constructor(private readonly root: HTMLElement) {}

  async mount(): Promise<void> {
    const productId = this.root.dataset.productId?.trim();
    const summaryUrl = this.root.dataset.summaryUrl?.trim();
    if (!productId || !summaryUrl) {
      this.root.hidden = true;
      return;
    }

    const settings = readSettings(this.root);
    this.root.hidden = false;
    this.root.innerHTML = `<span class="rx-summary__loading">Loading rating…</span>`;

    try {
      this.summary = await fetchProductSummary(summaryUrl);
    } catch (error) {
      console.error("[ReviewTrix] Review summary failed to load", error);
      this.root.innerHTML =
        `<span class="rx-summary__error" role="status">Unable to load ratings</span>`;
      return;
    }

    if (!this.summary.totalReviews) {
      this.root.hidden = true;
      this.root.innerHTML = "";
      return;
    }

    this.render(settings);
  }

  private render(settings: ReviewSummarySettings): void {
    if (!this.summary) return;

    const avg =
      this.summary.averageRating == null
        ? "0.0"
        : this.summary.averageRating.toFixed(1);

    const parts: string[] = [];

    if (settings.showStars || settings.showAverage) {
      parts.push(`<button type="button" class="rx-summary__rating-trigger" aria-label="Average rating ${avg} out of 5. Open rating breakdown." aria-haspopup="dialog">
        ${settings.showStars ? renderStarRating(this.summary.averageRating) : ""}
        ${settings.showAverage ? `<span class="rx-summary__avg">${avg}</span>` : ""}
        <span class="rx-summary__chevron" aria-hidden="true"></span>
      </button>`);
    }

    if (settings.showCount) {
      parts.push(
        `<button type="button" class="rx-summary__count" aria-label="See all ${this.summary.totalReviews} reviews">${formatCount(this.summary.totalReviews)}</button>`,
      );
    }

    this.root.innerHTML = `<div class="rx-summary__row">${parts.join("")}</div>`;
    this.root.hidden = false;

    const ratingTrigger = this.root.querySelector<HTMLElement>(
      ".rx-summary__rating-trigger",
    );
    const countButton = this.root.querySelector<HTMLElement>(".rx-summary__count");

    if (countButton) {
      bindScrollButton(countButton);
    }

    if (ratingTrigger) {
      const popover = new RatingPopover(ratingTrigger, {
        showSeeAll: settings.showSeeAll,
        enableAnimations: settings.enableAnimations,
        onSeeAll: () => {
          scrollToReviewsSection();
        },
      });
      popover.setSummary(this.summary);
    }
  }
}

export function mountAllReviewSummaries(
  selector = "[data-rx-review-summary]",
): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
    void new ReviewSummary(root).mount();
  });
}
