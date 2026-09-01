# MVP Pricing and Billing

Pricing is part of the launchable MVP. Keep it transparent and limited to two
plans so one developer can implement and support it reliably.

Use the Shopify Billing API through `@shopify/shopify-app-react-router`. The Pro
plan is declared in `app/shopify.server.ts`, and Shopify hosts charge approval
and handles charges, trials, proration, upgrades, and downgrades. Never collect
payment details or charge merchants outside Shopify.

Three rules exist because breaking any one of them fails App Store review
requirement 1.2.2:

- The `returnUrl` passed to `billing.request` must be the admin-hosted app URL
  (`https://admin.shopify.com/store/<handle>/apps/<apiKey>/app/billing`). An
  app-origin return URL drops the `shop` and `host` params Shopify appends, so
  the merchant lands on an App Bridge bootstrap page served with HTTP 200 and
  the plan never registers.
- Subscription checks must not filter out test charges. Development stores can
  only hold test subscriptions, so a non-test filter makes paid plans
  untestable during review.
- Every route calling `authenticate.admin` must hand an `ErrorResponse` to
  `boundary.error`. See the next section.

## The Return Trip Contract

`authenticate.admin` signals bounce, exit-iframe, and reauth by **throwing a
Response** whose body is an App Bridge `<script>` tag, and `renderAppBridge`
throws it with the default status of **200**. React Router converts a thrown
Response into an `ErrorResponse` and hands it to the nearest `ErrorBoundary`,
so the SDK depends on that boundary re-rendering the body:

```tsx
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return boundary.error(error);
  }

  return /* the route's own message */;
}
```

A route that renders its own text instead leaves the merchant on an HTTP 200
page with the script never executing, the redirect never completing, and the
plan never syncing. This produced the "200 error when approving charges"
rejection. The same reasoning applies to catch blocks: a thrown `Response` is
App Bridge control flow, so any `catch` around an Admin API call must rethrow
it rather than convert it into a message.

Shopify may still be flipping a just-approved subscription to `ACTIVE` when the
merchant lands back on the billing page, and `activeSubscriptions` omits it
until then. The billing loader therefore re-reads a bounded number of times
when the URL carries `charge_id`, before concluding the charge was declined.

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
- Refresh the cache from the `app_subscriptions/update` webhook, and again when
  the billing page loads.
- Treat the webhook payload as a trigger, never as truth. Shopify does not
  guarantee webhook ordering, so the handler re-reads the active subscriptions
  from Shopify and writes that verified state. Writing the delivered status
  directly would let a late `PENDING` or a stale `DECLINED` downgrade an
  already-approved merchant.
- Re-verify with Shopify when cached state is missing or stale.
- Centralize entitlement checks in one billing service.
- Enforce allowances server-side; hiding UI is not enforcement.

## Upgrade Flow

1. Merchant chooses Pro.
2. `billing.request` creates the subscription and redirects to Shopify's charge
   approval page.
3. Shopify processes approval and returns the merchant to the admin-hosted
   billing page.
4. The `app_subscriptions/update` webhook records the new status, and the
   billing page verifies the active subscription with Shopify on load.
5. The app refreshes the entitlement cache.
6. Pro allowances become available.

A declined charge follows the same return path and leaves the shop on Free.

## Downgrade and Cancellation

- Merchants can change plans without contacting support or reinstalling.
- Cancellation happens in Shopify Admin; the `app_subscriptions/update` webhook
  downgrades the cached plan.
- Reinstall resets the cached plan to Free so Shopify can request approval for
  charges again, as required by App Store requirement 1.2.2.
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

- Use the Shopify Billing API or another Shopify-provided billing solution.
- Display accurate pricing, limits, trial terms, and additional charges.
- Support self-serve upgrade and downgrade.
- Ensure charges appear correctly in Shopify Admin.
- Test trial conversion, cancellation, reinstall, and failed-payment paths.
- Do not claim unavailable paid features.

Official references:

- https://shopify.dev/docs/apps/launch/billing
- https://shopify.dev/docs/apps/launch/billing/manual-pricing
- https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements

Shopify App Pricing is the newer default for public apps. Migrating is tracked
as follow-up work, not part of this MVP.

## Future Pricing

Growth, usage-based, and Enterprise plans remain future hypotheses. Introduce
another plan only when real merchant demand cannot be served clearly by Free
and Pro.
