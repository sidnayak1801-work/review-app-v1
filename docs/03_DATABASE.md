# Database

PostgreSQL is the application database. Prisma owns the schema and migrations.

The schema should support the MVP only. Add tables when a roadmap phase needs
them; do not pre-create tables for advanced billing, AI, media, loyalty,
referrals, analytics, or integrations.

## Conventions

- Use application-generated string IDs.
- Every merchant-owned table includes `shopId`.
- Store Shopify resource IDs as strings.
- Include `createdAt` and `updatedAt` where records can change.
- Use enums for small, stable workflow states.
- Add constraints for invariants and indexes for real access patterns.
- Never store OAuth tokens outside Shopify session storage.
- Never delete merchant-owned review data merely because the app is
  uninstalled or a plan changes.

## Phase 0 Tables

### Session

Owned by Shopify's Prisma session storage adapter.

Purpose:

- OAuth sessions
- Access and refresh tokens
- Granted scopes and expiration

Application features should use the Shopify authentication layer rather than
querying Session records directly.

### Shop

Tenant identity and installation state.

Current fields:

- `id`
- `shopDomain` — unique
- `shopifyShopId` — unique when present
- `plan`
- `status`
- `installedAt`
- `uninstalledAt`
- `createdAt`
- `updatedAt`

Phase 1 Shop lifecycle connects this model to installation, reinstallation, and
uninstall workflows. Uninstall sets `status = UNINSTALLED` and `uninstalledAt`
without deleting the row.

## Phase 1 Tables

### Review

The core product-review record.

Planned fields:

- `id`
- `shopId`
- `shopifyProductId`
- `productTitle` — optional title snapshot for merchant moderation UI
- `shopifyCustomerId` — optional
- `rating` — integer constrained to 1–5
- `title` — optional
- `body`
- `authorName`
- `authorEmail` — optional and never exposed publicly
- `status` — `PENDING`, `APPROVED`, or `REJECTED`
- `source` — `STOREFRONT`, `MERCHANT`, or `IMPORT`
- `verifiedPurchase`
- `featured` — merchant highlight flag (Phase 5.1)
- `merchantReply` / `merchantReplyAt` — single merchant reply (Phase 5.1)
- `publishedAt` — optional
- `createdAt`
- `updatedAt`

Required indexes:

- `(shopId, status, createdAt)`
- `(shopId, shopifyProductId, status, createdAt)`

Repository queries must always include `shopId`. Storefront reads return only
approved reviews.

### WidgetSettings

One row per shop for the MVP widget.

Current fields:

- `id`
- `shopId` — unique
- `widgetEnabled`
- `accentColor`
- `primaryButtonColor`
- `starColor`
- `borderRadius` — 0–20 px
- `cardShadow`
- `layout` — `STACKED`, `COMPACT`, or `GRID`
- `showCustomerName`
- `showReviewDate`
- `showProductImages`
- `showCustomerPhotos`
- `autoPublishReviews`
- `darkMode`
- `showReviewForm`
- `reviewsPerPage` — 5, 10, 20, or 50
- `createdAt`
- `updatedAt`

Prefer explicit columns for stable MVP settings. Introduce a versioned JSON
configuration only if later widget types need substantially different shapes.

### ReviewMedia

Photo and video attachments for reviews (optional `reviewId` until attached).

Current fields:

- `id`
- `shopId`
- `reviewId` — nullable until the review is created
- `kind` — `IMAGE` or `VIDEO`
- `storageKey`
- `url` — public CDN/object URL
- `mimeType`
- `sizeBytes`
- `width` / `height` — optional
- `position`
- `createdAt`
- `updatedAt`

Indexes: `(shopId, reviewId)`, `(reviewId, position)`, `(shopId, createdAt)`.

Limits (enforced in service): up to 5 images and 1 video per review; images
and videos ≤10 MB each. Production uses S3-compatible storage (Cloudflare R2);
local development can use disk under `storage/media` served at `/api/media/*`.

## Phase 2 Tables

### Shop Billing Fields

Billing extends the existing Shop record rather than introducing a billing
subsystem.

Planned fields or enum changes:

- `plan` — `FREE` or `PRO`
- `billingStatus` — minimal cached entitlement state
- `billingSyncedAt` — last successful verification with Shopify

Shopify remains the subscription source of truth. Refresh the cached
entitlement after plan changes and relevant Shopify lifecycle events. Query
Review and ReviewRequest records for the two enforced allowances; do not add a
generic usage table.

### ReviewRequest

Tracks one review request for an order product.

Planned fields:

- `id`
- `shopId`
- `shopifyOrderId`
- `shopifyProductId`
- `customerEmail`
- `status` — `SCHEDULED`, `SENT`, `FAILED`, `CANCELLED`, or `COMPLETED`
- `scheduledAt`
- `sentAt` — optional
- `attemptCount`
- `lastErrorCode` — optional; no sensitive provider response
- `submissionTokenHash`
- `createdAt`
- `updatedAt`

Required constraints and indexes:

- Unique `(shopId, shopifyOrderId, shopifyProductId)`
- Index `(status, scheduledAt)` for due work
- Index `(shopId, createdAt)` for merchant history

### ReviewImport

Tracks a CSV import without storing every source row permanently.

Planned fields:

- `id`
- `shopId`
- `status` — `PENDING`, `PROCESSING`, `COMPLETED`, or `FAILED`
- `fileKey`
- `totalRows`
- `importedRows`
- `failedRows`
- `errorFileKey` — optional downloadable validation report
- `createdAt`
- `updatedAt`

Required index:

- `(shopId, createdAt)`

Imported reviews are written to Review with `source = IMPORT`. Process rows in
bounded batches rather than loading the entire file into memory.

## Phase 5.2 Tables

### Question

Product Q&A records owned by the app (not Shopify).

Fields:

- `id`
- `shopId`
- `shopifyProductId` — Shopify product GID (normalized)
- `productTitle` — optional snapshot for merchant UI
- `customerName`
- `email` — never exposed on the storefront
- `question`
- `answer` — optional merchant reply
- `status` — `PENDING`, `PUBLISHED`, `HIDDEN`, or `ANSWERED`
- `answeredAt` — set when a merchant answer is saved
- `publishedAt` — set on first transition to `PUBLISHED` or `ANSWERED`
- `createdAt`
- `updatedAt`

Indexes:

- `(shopId, status, createdAt)`
- `(shopId, shopifyProductId, status, createdAt)`
- `(shopId, email)` — privacy redact / data request

Storefront lists only `PUBLISHED` and `ANSWERED`. Customer submit creates
`PENDING`. Approve → `PUBLISHED`. Answer sets `answer` and usually →
`ANSWERED` (stays `HIDDEN` if already hidden). Hide → `HIDDEN`.

## Phase 4 Notes — Review-request settings

`ReviewRequestSettings` (1:1 with Shop):

- `requestDelayDays` — Free global delay (1–14, default 3)
- `domesticDelayDays` / `internationalDelayDays` — Pro delays (1–30 each)
- `homeCountryCode` — ISO country used to classify domestic vs international
- `emailSubject` / `emailBodyHtml` — first-request template (placeholders)
- `reminderEnabled` / `reminderDelayDays` / `reminderSubject` / `reminderBodyHtml`

`ReviewRequest.reminderSentAt` — set on one row per order when a reminder email
is sent (counts as one monthly email credit).

Multi-product emails group due rows by `(shopId, shopifyOrderId)` for one
outbound message. Per-product rows remain for tokens and status. Email credits
count distinct orders with `sentAt` in the UTC month plus reminder rows with
`reminderSentAt` in that month.

## Tables Deferred Until a Feature Needs Them

- `StoreReview`
- `EmailTemplate` or `EmailCampaign`
- Subscription-history and generic usage-metering tables
- Analytics aggregates
- Integration credentials and deliveries
- Loyalty, referral, and coupon records
- AI outputs

When a deferred feature is approved for a roadmap phase, document its access
patterns and retention rules before adding its migration.

## Migration Rules

- One focused migration per schema change.
- Review generated SQL before applying it.
- Never edit a migration already applied to production.
- Backfill before making a populated field required.
- Test destructive changes against a database copy.
- Prefer additive migrations during active merchant use.

## Data Retention and Privacy

- Uninstall (`app/uninstalled`): mark shop `UNINSTALLED`, delete sessions, retain
  merchant review data until `shop/redact`.
- Customer data request (`customers/data_request`): locate reviews, questions,
  and review requests by email / customer id; operator exports within 30 days.
  See `10_OPERATIONS.md`.
- Customer redaction (`customers/redact`): anonymize review author fields and
  question asker fields; redact and cancel matching review requests.
- Shop redaction (`shop/redact`, ~48h after uninstall): delete the Shop row and
  cascade owned application data.
- Store only customer data required for review, Q&A, and email-request workflows.
- Do not log review text, email addresses, access tokens, or import contents.
- Backup, restore, and export procedures: `10_OPERATIONS.md`.
