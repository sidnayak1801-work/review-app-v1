# API Plan

This document defines intended application boundaries, not a promise to build
every endpoint immediately. Implement endpoints only in their roadmap phase.

## API Principles

- Use React Router loaders/actions as HTTP entry points.
- Keep business rules in feature services.
- Validate request data and query parameters with Zod.
- Derive tenant identity from verified Shopify context.
- Never authorize access using a client-provided `shopId` alone.
- Return only fields required by the caller.
- Use cursor pagination for lists that can grow.
- Make webhook and retryable operations idempotent.
- Version public contracts before making breaking changes.

## Response Conventions

Successful list responses:

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasNextPage": false
  }
}
```

Safe error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid."
  }
}
```

Do not return stack traces, Prisma errors, secrets, or customer data in errors.

## Existing Foundation Routes

- Shopify authentication routes
- `POST /webhooks/app/uninstalled`
- `POST /webhooks/app/scopes_update`
- `POST /webhooks/compliance` — mandatory privacy topics:
  `customers/data_request`, `customers/redact`, `shop/redact`
- `GET /health` — liveness; `GET /health?ready=1` — database readiness

These webhook routes use Shopify request verification.

## Phase 1 — Reviews and Widget

### Authenticated merchant routes

- `GET /api/admin/reviews`
  - Cursor-paginated reviews for the authenticated shop
  - Optional product and moderation-status filters
- `POST /api/admin/reviews`
  - Create a merchant-entered review
- `PATCH /api/admin/reviews/:reviewId`
  - Edit review content or change moderation status
- `DELETE /api/admin/reviews/:reviewId`
  - Delete a review belonging to the authenticated shop
- `GET /api/admin/widget-settings`
  - Return the authenticated shop's widget settings
- `PUT /api/admin/widget-settings`
  - Validate and replace the MVP widget settings

### Storefront routes

- `GET /api/storefront/reviews`
  - Requires verified storefront/app-proxy context
  - Requires a Shopify product ID
  - Returns approved public review fields only
- `POST /api/storefront/reviews`
  - Requires verified storefront/app-proxy context
  - Requires signed-in storefront customer (`logged_in_customer_id` on the
    signed app-proxy query); otherwise returns `401 AUTH_REQUIRED`
  - Creates a pending review attributed to that customer (name/email from the
    logged-in customer; no guest email field)
  - Applies validation, rate limiting, and spam protection

The public storefront contract uses the Shopify app proxy:

- Storefront path: `/apps/reviews`
- App route: `/api/storefront/reviews`
- Authenticated with `authenticate.public.appProxy`
- Query `productId` (numeric or GID) for approved reviews
- POST requires `logged_in_customer_id` and creates a pending storefront review
  with honeypot and rate limiting
- Guests see an in-widget sign-in wall linking to Liquid
  `routes.storefront_login_url` / `routes.account_register_url` (Shopify owns
  account auth)

Review-request email links use a separate public token API and do **not**
require storefront login:

- `GET/POST /api/review-request?token=...` — verified purchase email flow

## Phase 2 — Requests, Moderation, Imports, and Billing

Moderation continues to use the Phase 1 review update route.

### Review-request emails

App routes:

- `/app/review-requests` — authenticated merchant history and monthly usage
- `POST /webhooks/orders/fulfilled` — verified Shopify webhook; schedules one
  request per fulfilled order product
- `GET/POST /api/review-request?token=...` — public token lookup and review
  submission (creates a pending review); rate-limited per client IP

Email provider:

- Production: Resend when `RESEND_API_KEY` and `EMAIL_FROM` are configured
- Development fallback: console logging

Required scope: `read_orders`

Limits:

- Free: 50 review-request emails per UTC calendar month
- Pro: 1,000 review-request emails per UTC calendar month
- Count increments when the provider first accepts delivery; retries do not
  consume additional allowance
- Allowance counts emails, not products. Phase 4 multi-product sends still use
  one credit per outbound email.

MVP / Phase 4 behavior:

- Merchant-configurable delay (Free: one global 1–14 days; Pro: domestic /
  international 1–30 days via shipping country vs home country)
- One email per fulfilled order listing products (Free up to 5 links; Pro all)
- Editable subject/body templates with `{{shop_name}}`, `{{review_links}}`, etc.
- Optional one reminder email after `reminderDelayDays` if any product review
  is still incomplete (one additional monthly credit)
- Settings UI: `/app/review-requests`

### CSV review import

App route: `/app/imports`

- Authenticated embedded admin route
- `POST` multipart upload with `file` (CSV) creates and processes an import job
  synchronously
- Sample CSV downloads client-side from the Imports page
- `GET /app/imports/download?type=error-report&importId=...` returns the
  row-level error report CSV (authenticated session token)

Required CSV headers:

- `product_id` — numeric product ID or Shopify product GID
- `rating` — integer 1–5
- `body` — review text (max 5,000 characters)
- `author_name` — reviewer display name (max 100 characters)

Optional headers:

- `title` — review title (max 200 characters)
- `author_email` — valid email
- `status` — `PENDING`, `APPROVED`, or `REJECTED` (default `PENDING`)
- `verified_purchase` — `true` or `false` (default `false`)

Limits:

- Max file size: 1 MB
- Max rows: 500
- Processing batch size: 50 rows

Imported reviews use `source = IMPORT`. Rows with `status = APPROVED` consume
published-review allowance during import. Duplicate uploads with the same CSV
content hash per shop are rejected.

### Billing

App route: `/app/billing`

- Authenticated embedded admin route
- Loader syncs Shopify subscription state to cached `Shop.plan`
- `POST intent=upgrade` starts Shopify-hosted Pro subscription approval
- `POST intent=sync` refreshes billing state from Shopify

Deferred REST-style admin endpoints (future if needed):

- `POST /api/admin/review-imports`
- `GET /api/admin/review-imports/:importId`
- `GET /api/admin/review-requests`

Email delivery and import processing are service workflows, not public
"send now" endpoints.

### Billing boundaries

- Shopify App Pricing hosts plan selection and billing.
- An authenticated billing entry route redirects merchants to Shopify's hosted
  plan experience.
- The configured Shopify welcome link verifies the active subscription before
  updating the Shop entitlement cache.
- Relevant Shopify billing lifecycle events refresh or invalidate cached
  entitlements.
- Paid actions check allowances server-side; no public endpoint can assign a
  plan or bypass limits.

Do not build a custom checkout, card form, or public billing API.

## Deferred APIs

Do not implement these during MVP phases:

- Replies
- Media upload
- Advanced analytics
- Advanced usage metering
- AI processing
- Partner/public API access
- Third-party integrations

Add each contract when its feature enters the active roadmap phase.

## Security and Limits

- Authenticate all merchant routes with Shopify admin authentication.
- Verify app proxy and webhook signatures.
- Validate ownership in the service/repository boundary.
- Cap page size, review body length, and import file size.
- Rate-limit public submissions.
- Avoid returning reviewer email addresses from storefront APIs.
- Add CSRF protections where the selected transport requires them.
- Log request IDs and error codes, not request bodies.
