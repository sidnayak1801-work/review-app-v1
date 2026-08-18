# MVP Pricing and Billing

Pricing is part of the launchable MVP. Keep it transparent and limited to two
plans so one developer can implement and support it reliably.

Use Shopify App Pricing, Shopify's default recommended billing approach for
public App Store apps. Shopify hosts plan selection and handles approval,
charges, trials, proration, upgrades, and downgrades. Never collect payment
details or charge merchants outside Shopify.

## Free Plan

Price: `$0`

Includes:

- Up to 100 published reviews
- Up to 100 review-request emails per month
- Text review submission
- Pending, approved, and rejected moderation
- Product review widget and star-rating badge
- Basic widget settings
- CSV review import
- Standard support

Phase 4 review-request entitlements:

- One global review-request delay setting (1–14 days, default 3)
- Multi-product request emails: one email per order, up to 5 products listed
- Editable email templates and optional reminder emails

## Pro Plan

Price: `$19/month`

Trial: `14 days`

Includes everything in Free plus:

- Unlimited published reviews
- Unlimited review-request emails per month
- Separate domestic and international review-request delays
- Multi-product request emails listing all order items
- Priority support

Phase 4 review-request entitlements:

- Separate domestic and international review-request delays (1–30 days each)
- Multi-product request emails: one email per order listing all products
- Editable email templates and optional reminder emails

Photo/video on storefront submissions, merchant replies, and Theme App
Extension widgets ship on Free and Pro (subject to published-review allowances).
Do not advertise advanced email open/conversion analytics, AI theme analysis,
or “remove app branding” as live Pro benefits until those features exist.

## Allowance Definitions

Published reviews:

- Count Review records with `status = APPROVED`.
- Pending and rejected reviews do not consume the allowance.
- Imported reviews count only after approval.

Review-request emails:

- Use one UTC calendar-month allowance window for both plans.
- Count each **email accepted for delivery** once, not each product line on the
  order. A multi-product email therefore consumes one credit.
- Retries and failed requests do not consume another allowance.

Do not add a generic usage ledger. Use indexed counts from Review and
ReviewRequest until measured load requires an aggregate.

## Entitlement Source of Truth

- Shopify is the subscription source of truth.
- The Shop record may cache `FREE` or `PRO` and minimal synchronization state
  for request-time checks.
- Refresh the cache after the Shopify-hosted plan flow and relevant billing
  lifecycle events.
- Re-verify with Shopify when cached state is missing or stale.
- Centralize entitlement checks in one billing service.
- Enforce allowances server-side; hiding UI is not enforcement.

## Upgrade Flow

1. Merchant chooses Pro.
2. Redirect to Shopify's hosted App Pricing experience.
3. Shopify processes approval and returns to the configured welcome link.
4. The app verifies the active subscription with Shopify.
5. The app refreshes the entitlement cache.
6. Pro allowances become available.

## Downgrade and Cancellation

- Merchants can change plans without contacting support or reinstalling.
- Never delete reviews, requests, settings, or imports.
- Existing approved reviews remain visible after downgrade.
- If approved reviews exceed 100, block new approvals until the merchant
  reduces the count or upgrades.
- Stop scheduling new emails after the Free monthly allowance is reached.
- Preserve pending email records and explain how the limit affects them.
- Show contextual upgrade guidance without blocking unrelated app use.

## Failed or Unverified Billing State

- Do not grant Pro based only on a browser redirect or client-provided value.
- If Shopify cannot be reached, use a recently verified cache for a short,
  documented grace period.
- After the grace period, fail closed for new Pro-only actions while preserving
  existing public reviews.
- Log billing error codes without tokens or sensitive Shopify responses.

## Built for Shopify Billing Traits

- Use Shopify App Pricing or another Shopify-provided billing solution.
- Display accurate pricing, limits, trial terms, and additional charges.
- Support self-serve upgrade and downgrade.
- Ensure charges appear correctly in Shopify Admin.
- Test trial conversion, cancellation, reinstall, and failed-payment paths.
- Do not claim unavailable paid features.

Official references:

- https://shopify.dev/docs/apps/launch/billing
- https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing
- https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements

## Future Pricing

Growth, usage-based, and Enterprise plans remain future hypotheses. Introduce
another plan only when real merchant demand cannot be served clearly by Free
and Pro.
