# ReviewX Theme App Extension - Review Summary Specification

## Overview

The Review Summary is a Theme App Extension block that appears directly below the Shopify product title on the storefront.

Its purpose is to provide customers with an instant overview of the product's rating while allowing them to:

- View rating distribution
- View average rating
- View total reviews
- Navigate directly to the reviews section

The interaction should be similar to Amazon and Judge.me while following ReviewX's modern design system.

---

# Feature Name

Review Summary

---

# Location

Storefront Product Page

Position:

Product Title

↓

Review Summary

↓

Price

↓

Buy Buttons

---

# UI Layout

Inline trigger (Amazon-style, under product title):

⭐⭐⭐⭐☆ 4.3 ▾   (11,333)

Where:

- Stars + average + chevron open the rating card
- Count in parentheses scrolls to the reviews section
- Layout is responsive and uses Theme Editor colors (default star `#FFA41C`)

---

# User Interactions

## Average Rating

Clicking the average rating (stars / number / chevron) opens a Popover card.

Popover content:

- Average Rating (“X.X out of 5”)
- Total ratings
- Percentage histogram (5 star → 1 star progress bars)
- “See customer reviews ›” link (scrolls to `#reviewx-reviews`)

Example card:

⭐⭐⭐⭐☆ 4.3 out of 5

11,333 ratings

5 star ██████████ 62%

4 star ███ 21%

3 star ██ 10%

2 star █ 2%

1 star █ 5%

--------------------

See customer reviews ›

---

## Review Count

Example

(11,333)

Clicking it smoothly scrolls to the Review Section.

Behavior:

document.getElementById("reviewx-reviews")

↓

scrollIntoView()

Smooth scrolling only.

---

# Theme App Extension

Implementation Type:

Theme App Extension

Block Name:

Review Summary

Merchant can:

- Enable
- Disable
- Drag
- Reorder

inside Shopify Theme Editor.

---

# Block Files

extensions/

review-widget/

blocks/

review-summary.liquid

assets/

review-summary.js

review-summary.css

Built assets only under `assets/`. TypeScript sources live outside the
extension (Shopify allows only `assets`, `blocks`, `snippets`, `locales`):

`tooling/review-summary/src/` — modules (`ReviewSummary`, `StarRating`,
`RatingPopover`, `RatingBar`, scroll). Build with `npm run build:review-summary`.

---

# Implementation notes (shipped)

- Lives in the existing Theme App Extension `extensions/review-widget` as the
  **Review Summary** block (Shopify allows only **one** theme extension per
  app — a second `reviewx-theme` extension is not allowed).
- Source/build tooling is under `tooling/review-summary/` so the extension
  directory stays schema-valid.
- Shopify allows one app proxy. Storefront calls:

  `GET /apps/reviews/products/{productId}/summary`

  which maps to:

  `GET /api/storefront/reviews/products/:productId/summary`

  (same JSON body as the logical product-summary contract below).
- Review list root uses `id="reviewx-reviews"` for smooth scroll.
- Aggregates live in `ProductRatingSummary` (not recalculated on every hit).

---

# Data Source

The Theme Extension never queries Shopify Reviews.

It fetches ReviewX backend.

Logical resource (app route under the existing reviews proxy):

GET

/api/storefront/reviews/products/{productId}/summary

Storefront URL:

/apps/reviews/products/{productId}/summary

---

# API Response

{
  "productId": "gid://shopify/Product/123",

  "averageRating": 4.8,

  "totalReviews": 1245,

  "distribution": {

      "5": 900,

      "4": 225,

      "3": 75,

      "2": 25,

      "1": 20

  }

}

---

# Rating Percentage

Frontend calculates:

percentage

=

ratingCount

/

totalReviews

×

100

Example:

900 / 1245

=

72%

---

# Components

ReviewSummary

Responsible for:

- Display average
- Display stars
- Display review count

---

StarRating

Responsible for:

- Full stars
- Half stars
- Empty stars

Reusable.

---

RatingPopover

Responsible for:

- Popover positioning
- Distribution
- Average
- Total reviews

---

RatingBar

Displays:

★★★★★

█████████

72%

Reusable for all rating rows.

---

ReviewScrollButton

Handles

scrollIntoView()

---

# Backend Responsibilities

The backend exposes a public endpoint for storefront requests.

Responsibilities:

- Validate shop
- Validate product
- Return summary
- Cache results
- Handle CORS
- Rate limiting

---

# Database

Review table

Contains:

- Review ID
- Product ID
- Rating
- Title
- Body
- Media
- Customer
- Status
- Created At

---

# Rating Summary Table

Store aggregated values.

Columns:

product_id

average_rating

total_reviews

five_star

four_star

three_star

two_star

one_star

updated_at

Never calculate these values on every page load.

Whenever:

- Review created
- Review edited
- Review deleted

update this table.

Product page always reads this summary.

---

# Performance

Only ONE API request should be made.

Do NOT request:

Average

↓

Distribution

↓

Review Count

separately.

Everything comes from one endpoint.

---

# Accessibility

Keyboard accessible.

Popover closes with Escape.

Focusable elements.

ARIA labels.

Accessible progress bars.

Screen reader friendly.

---

# Responsive

Desktop

Average and review count displayed inline.

Mobile

Remain inline when possible.

Popover width adjusts automatically.

---

# Theme Editor Settings

Merchant configurable settings:

Show stars

Show average

Show review count

Show "See all reviews"

Accent color

Star color

Text color

Font size

Spacing

Border radius

Enable animations

---

# Future Compatibility

The component should support future additions without breaking API:

- Recommendation percentage

- Verified buyer percentage

- AI review summary

- Photo count

- Video count

- Review badges

- Review filters

No redesign should be required.

---

# Coding Standards

Use:

TypeScript

TailwindCSS

Liquid

Vanilla JS inside Theme Extension

Reusable components

Strict typing

No duplicated logic

No inline styles

Minimal API requests

Lazy-loaded popover content if needed

Production-ready architecture.