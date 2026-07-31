import { renderRatingBar } from "./rating-bar";
import { renderStarRating } from "./star-rating";
import { scrollToReviewsSection } from "./review-scroll";
import type { ProductSummaryResponse } from "../api/summary";

export type RatingPopoverOptions = {
  showSeeAll: boolean;
  enableAnimations: boolean;
  onSeeAll?: () => void;
};

const LEAVE_CLOSE_DELAY_MS = 140;
const CLOSE_ANIMATION_MS = 140;

export class RatingPopover {
  private readonly wrap: HTMLElement;
  private panel: HTMLElement | null = null;
  private open = false;
  private closing = false;
  private suppressOpen = false;
  private leaveTimer: number | null = null;
  private closeAnimTimer: number | null = null;
  private readonly onDocumentKey: (event: KeyboardEvent) => void;

  constructor(
    private readonly trigger: HTMLElement,
    private readonly options: RatingPopoverOptions,
  ) {
    this.wrap = document.createElement("div");
    this.wrap.className = "rx-summary__popover-wrap";
    trigger.replaceWith(this.wrap);
    this.wrap.appendChild(trigger);

    this.onDocumentKey = (event) => {
      if (event.key === "Escape" && this.open) {
        event.preventDefault();
        this.dismissIntentional();
      }
    };

    this.wrap.addEventListener("pointerenter", () => {
      this.clearLeaveTimer();
      if (this.suppressOpen) return;
      this.openWith(this.lastSummary);
    });

    this.wrap.addEventListener("pointerleave", () => {
      this.suppressOpen = false;
      this.scheduleClose();
    });

    this.wrap.addEventListener("focusin", () => {
      this.clearLeaveTimer();
      if (this.suppressOpen) return;
      this.openWith(this.lastSummary);
    });

    this.wrap.addEventListener("focusout", (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && this.wrap.contains(next)) {
        return;
      }
      this.scheduleClose();
    });

    // Hover is primary; click toggles for touch when not suppressed.
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.open) {
        this.dismissIntentional();
      } else if (!this.suppressOpen) {
        this.openWith(this.lastSummary);
      }
    });

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
  }

  private lastSummary: ProductSummaryResponse | null = null;

  setSummary(summary: ProductSummaryResponse): void {
    this.lastSummary = summary;
  }

  private clearLeaveTimer(): void {
    if (this.leaveTimer != null) {
      window.clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
  }

  private clearCloseAnimTimer(): void {
    if (this.closeAnimTimer != null) {
      window.clearTimeout(this.closeAnimTimer);
      this.closeAnimTimer = null;
    }
  }

  private scheduleClose(): void {
    this.clearLeaveTimer();
    this.leaveTimer = window.setTimeout(() => {
      this.leaveTimer = null;
      this.close({ animate: true });
    }, LEAVE_CLOSE_DELAY_MS);
  }

  /** × / Escape / trigger click-when-open: force close and block reopen until leave. */
  private dismissIntentional(): void {
    this.suppressOpen = true;
    this.blurFocusInsideWrap();
    this.close({ animate: true, force: true });
  }

  private blurFocusInsideWrap(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && this.wrap.contains(active)) {
      active.blur();
    }
  }

  openWith(summary: ProductSummaryResponse | null): void {
    if (this.suppressOpen) return;
    if (!summary || summary.totalReviews <= 0) return;
    this.lastSummary = summary;
    this.clearLeaveTimer();

    if (this.open && this.panel && !this.closing) {
      return;
    }

    if (this.closing && this.panel) {
      this.clearCloseAnimTimer();
      this.panel.remove();
      this.panel = null;
      this.closing = false;
      this.open = false;
    }

    const avg =
      summary.averageRating == null
        ? "0.0"
        : summary.averageRating.toFixed(1);
    const totalLabel = `${summary.totalReviews.toLocaleString()} ${
      summary.totalReviews === 1 ? "rating" : "ratings"
    }`;

    const bars = ([5, 4, 3, 2, 1] as const)
      .map((stars) =>
        renderRatingBar({
          stars,
          count: summary.distribution[String(stars) as "1" | "2" | "3" | "4" | "5"],
          totalReviews: summary.totalReviews,
        }),
      )
      .join("");

    const seeAll = this.options.showSeeAll
      ? `<div class="rx-popover__footer">
          <button type="button" class="rx-summary__see-all">See customer reviews ›</button>
        </div>`
      : "";

    this.panel = document.createElement("div");
    this.panel.className = "rx-popover";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", "Customer ratings");
    if (this.options.enableAnimations) {
      this.panel.dataset.animate = "true";
    }

    this.panel.innerHTML = `
      <div class="rx-popover__header">
        <div>
          <div class="rx-popover__headline">
            ${renderStarRating(summary.averageRating)}
            <span class="rx-popover__headline-text">${avg} out of 5</span>
          </div>
          <p class="rx-popover__total">${totalLabel}</p>
        </div>
        <button type="button" class="rx-popover__close" aria-label="Close rating summary">×</button>
      </div>
      <div class="rx-popover__bars">${bars}</div>
      ${seeAll}
    `;

    this.panel.querySelectorAll<HTMLElement>(".rx-bar__fill").forEach((fill) => {
      const track = fill.parentElement;
      const value = track?.getAttribute("aria-valuenow");
      if (value != null) {
        fill.style.width = `${value}%`;
      }
    });

    this.panel
      .querySelector(".rx-popover__close")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.dismissIntentional();
      });

    this.panel
      .querySelector(".rx-summary__see-all")
      ?.addEventListener("click", () => {
        this.suppressOpen = true;
        this.close({ animate: false, force: true });
        if (this.options.onSeeAll) {
          this.options.onSeeAll();
        } else {
          scrollToReviewsSection();
        }
      });

    this.wrap.appendChild(this.panel);
    this.open = true;
    this.closing = false;
    this.trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", this.onDocumentKey, true);
  }

  close(options: { animate?: boolean; force?: boolean } = {}): void {
    this.clearLeaveTimer();

    if (!this.panel) {
      this.open = false;
      this.closing = false;
      this.trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", this.onDocumentKey, true);
      return;
    }

    if (this.closing && !options.force) {
      return;
    }

    if (options.force && this.closing) {
      this.clearCloseAnimTimer();
      this.panel.remove();
      this.panel = null;
      this.closing = false;
      this.open = false;
      this.trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", this.onDocumentKey, true);
      return;
    }

    const panel = this.panel;
    const animate = options.animate !== false && this.options.enableAnimations;

    const finish = () => {
      this.closeAnimTimer = null;
      panel.remove();
      if (this.panel === panel) {
        this.panel = null;
      }
      this.closing = false;
      this.open = false;
      this.trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", this.onDocumentKey, true);
    };

    if (!animate) {
      this.clearCloseAnimTimer();
      finish();
      return;
    }

    this.closing = true;
    panel.dataset.closing = "true";
    this.clearCloseAnimTimer();
    this.closeAnimTimer = window.setTimeout(finish, CLOSE_ANIMATION_MS);
  }
}
