import "./styles.css";
import { mountAllReviewSummaries } from "./modules/review-summary";

function boot(): void {
  mountAllReviewSummaries();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

document.addEventListener("shopify:section:load", boot);
