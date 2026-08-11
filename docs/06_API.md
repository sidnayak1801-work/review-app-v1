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
- `GET /app/reviews`
  - Merchant moderation queue (cursor-paginated)
  - Optional `status`, `productId`, and free-text `q` (customer name, review
    title/body, product title; case-insensitive, tokenized AND)
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
  - Optional `sort` (default `most_recent`): `most_recent`,
    `highest_rating`, `lowest_rating`, `only_pictures`, `pictures_first`,
    `videos_first`
  - Optional `cursor` / `limit` for sort-aware keyset pagination (cursor must
    match the active `sort`)
  - Returns approved public review fields (including `featured`,
    `merchantReply`, `merchantReplyAt`), optional media, and widget settings
  - Featured reviews are sorted first within each page only for `most_recent`
- `POST /api/storefront/reviews`
  - Requires verified storefront/app-proxy context
  - Creates a review (`PENDING`, or `APPROVED` when auto-publish is enabled and
    under plan limits)
  - Accepts optional `mediaIds` from prior uploads and optional `productTitle`
    (snapshot for merchant admin)
  - Applies validation, rate limiting, and spam protection
  - Multipart `intent=uploadMedia` uploads a photo/video and returns a media
    record (up to 5 images + 1 video per review; each file ≤10 MB; JPEG/PNG/
    WebP/GIF/MP4/WebM/MOV). Production uses R2; local dev falls back to disk
    served at `GET /api/media/*`.
  - On success (`201`), may include `incentive` (thank-you copy + optional
    coupon code/headline and referral CTA). Coupon codes are **not** exposed
    on GET list settings — only after a successful submit when an ACTIVE
    post-review campaign is configured.
- `GET /api/storefront/reviews/qa`
  - Requires verified storefront/app-proxy context
  - Requires a Shopify product ID
  - Returns public Q&A fields only (`customerName`, `question`, `answer`,
    timestamps) for `PUBLISHED` and `ANSWERED` statuses — never `email`
  - Default page size 3 for collapsed lists; cursor pagination for “Show more”
- `POST /api/storefront/reviews/qa`
  - Creates a `PENDING` question
  - Honeypot + IP rate limit (`storefront-qa:{shopId}:{ip}`)
  - Notifies the merchant shop contact email via Resend/console provider
- `GET /api/storefront/reviews/products/:productId/summary`
  - Requires verified storefront/app-proxy context
  - Returns denormalized approved-review summary for the Review Summary block:
    `productId`, `averageRating`, `totalReviews`, `distribution` (`1`–`5`)
  - Reads `ProductRatingSummary` (recomputes once on cache miss)
  - Rate limit key: `storefront-summary:{shopId}:{ip}`
  - Cache-Control: `private, max-age=60`

The public storefront contract uses the Shopify app proxy:

- Storefront path: `/apps/reviews` (reviews), `/apps/reviews/qa` (Q&A), and
  `/apps/reviews/products/{productId}/summary` (Review Summary)
- App routes: `/api/storefront/reviews`, `/api/storefront/reviews/qa`, and
  `/api/storefront/reviews/products/:productId/summary`
- Authenticated with `authenticate.public.appProxy`
- Query `productId` (numeric or GID) for approved reviews
- Query `sort` for storefront list ordering / media filters (widget toolbar)
- Widget settings drive layout, colors, visibility, and page size
- Review-request email links use a separate public token API and do **not**
  require storefront login

Admin widget settings are saved via form actions on `/app` (dashboard) and
`/app/settings` (same service). Documented REST admin widget-settings routes
remain optional.

- `GET /app/dashboard-chart?days=365` — authenticated lazy Home chart series
  (7 / 30 / 90 / 365); Home first paint loads 90 days only
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

## Phase 5 — Product insights (admin UI)

Authenticated merchant routes (loaders/actions, not a public REST API):

- `GET /app/products/:productId` — product health dashboard (Shopify metadata,
  summary stats, rating mix, volume/rating trends, AI insight placeholders,
  product-scoped reviews)
- `POST /app/products/:productId` — Publish/Hide/Feature/Reply/Delete intents
  (same `reviewService` as `/app/reviews`)

There is no Products catalog list or nav item. Entry is via product name links
on Home and Reviews. Product IDs in the URL are numeric Shopify product IDs.

Local `/api/media/...` URLs are rewritten to the current app origin when
returned to admin/storefront clients so tunnel host changes do not break thumbs.

## Integrations (admin)

Authenticated admin route: `/app/integrations`.

- Connect / reconnect / disconnect / test for Klaviyo and Gorgias
- Credentials accepted on write only; responses never include secrets
- Requires `INTEGRATIONS_ENCRYPTION_KEY` (32-byte AES key)

Domain events (fire-and-forget; failures do not block review workflows):

- `review.published` — Klaviyo event + Gorgias ticket
- `review.merchant_reply` — Gorgias outbound ticket message when a ticket ref exists
- `review_request.sent` / `review_request.completed` — Klaviyo events

## Phase 5.5 — Public API (`/api/v1`)

Server-to-server REST API. No CORS. Available on Free and Pro.

### Authentication

- Header: `Authorization: Bearer <token>`
- Tokens are per-shop (`ApiToken`); plaintext shown once on create/rotate
- Soft revoke via `revokedAt`; auth rejects revoked/unknown tokens identically
- Max 5 active tokens per shop; rotate creates a replacement then revokes the old

Merchant admin: `/app/api` — docs, generate, copy (once), revoke, rotate.

### Endpoints

- `GET /api/v1/reviews` — cursor-paginated approved reviews
  (`productId?`, `cursor?`, `limit?`)
- `POST /api/v1/reviews` — submit review (`source: API`, status `PENDING`)
- `GET /api/v1/reviews/summary` — `approvedCount`, `averageRating`,
  `ratingDistribution` (`productId?`)
- `GET /api/v1/rating` — `averageRating`, `approvedCount` (`productId?`)
- `GET /api/v1/products/:productId/reviews` — product-scoped approved list

List responses omit reviewer email. Errors use `{ error: { code, message } }`.

### Rate limiting

Architecture only: `RateLimiter` interface with in-memory fixed-window
implementation (default 120 req/min per token). Plan-aware policy hook exists
for future Free/Pro divergence. Response headers:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
Swap in Redis later without changing route adapters. Shared
`handlePublicApi` / `authenticateBearer` are GraphQL-ready.

## Merchant onboarding (authenticated Admin)

Source of truth: `docs/onboarding/`.

Primary UI: `/app/onboarding?screen=welcome|health|checklist|theme|import|automation|branding|celebration`.

`GET/POST /api/onboarding/status` — Shopify Admin session required.

GET returns `{ ok, status }` with:
`themeEnabled`, `reviewsImported`, `automationConfigured`,
`brandingConfigured`, `completed`, `skipped`, `completedAt`,
`needsOnboarding`, `progress` (0–100).

POST `intent` values: `start`, `theme`, `import`, `automation`, `branding`,
`skip`, `complete`.

Thin helpers (same auth):
`POST /api/onboarding/theme`, `/import`, `/automation`, `/branding`,
`/complete`.

`start` persists `startedAt` once. `complete` cancels pending onboarding
reminder lifecycle emails and queues a one-time completion email. `skip`
cancels pending reminders only (no completion email).

## Internal jobs

`POST /internal/process-lifecycle-emails` — processes due merchant lifecycle
email jobs. Requires `Authorization: Bearer $INTERNAL_JOB_SECRET`. Not for
browser or Shopify Admin use. Prefer Coolify cron against this route, or run
`npm run worker:lifecycle` / `npm run docker-worker` as a second service.

## Deferred APIs

Do not implement these until their roadmap phase is active:

- Replies inbound from Gorgias webhooks
- Advanced analytics warehouse
- Advanced usage metering
- AI processing
- Public GraphQL API (reuse v1 auth + rate-limit modules)
- Additional third-party channels (Zapier, WhatsApp, etc.)

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
