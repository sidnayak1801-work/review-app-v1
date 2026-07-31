const REVIEWS_SECTION_ID = "reviewx-reviews";

export function scrollToReviewsSection(): boolean {
  const target = document.getElementById(REVIEWS_SECTION_ID);
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function bindScrollButton(button: HTMLElement): void {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToReviewsSection();
  });
}
