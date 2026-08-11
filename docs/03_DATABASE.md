# Database

PostgreSQL is the application database. Prisma owns the schema and migrations.

The schema should support the active roadmap only. Add tables when a roadmap
phase needs them; do not pre-create tables for advanced billing, AI, media,
loyalty, referrals, or analytics ahead of an approved phase.

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
- `contactEmail` — optional merchant contact for lifecycle emails
- `firstInstalledAt` — original install time; never overwritten on reinstall
- `latestInstalledAt` — updated on every install/reinstall
- `installedAt` — kept in sync with `latestInstalledAt` for existing callers
- `uninstalledAt`
- `createdAt`
- `updatedAt`

### OnboardingStatus

One row per shop tracking merchant launch-checklist progress
(see `docs/onboarding/`).

- `themeEnabled`, `reviewsImported`, `automationConfigured`,
  `brandingConfigured`
- `completed`, `skipped`, `startedAt`, `completedAt`
- Created on install via `onboardingService.ensureForShop`
- Progress for UI is derived as 25% per completed checklist flag
- Lifecycle emails treat onboarding as incomplete when
  `!completed && !skipped` (`needsOnboarding`)

Phase 1 Shop lifecycle connects this model to installation, reinstallation, and
uninstall workflows. Uninstall sets `status = UNINSTALLED` and `uninstalledAt`
without deleting the row.

### LifecycleEmail

Database-backed merchant onboarding lifecycle email jobs
(welcome, 24h/72h reminders, completion). See
`docs/18_ReviewTrix_Lifecycle_Email_Implementation_Plan.md`.

- `shopId` + `type` — unique (`WELCOME`, `ONBOARDING_REMINDER_24H`,
  `ONBOARDING_REMINDER_3D`, `ONBOARDING_COMPLETED`)
- `status` — `SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED`
- `scheduledFor`, `sentAt`, `failedAt`, `attemptCount`, `lastErrorCode`,
  `providerMessageId`
- Index `(status, scheduledFor)` for due-job polling
- Worker claims atomically; eligibility always re-checked against Shop +
  OnboardingStatus before send

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
- `source` — `STOREFRONT`, `MERCHANT`, `IMPORT`, or `API`
- `verifiedPurchase`
- `featured` — merchant highlight flag (Phase 5.1)
- `hasImage` / `hasVideo` — denormalized media flags for storefront sort
- `merchantReply` / `merchantReplyAt` — single merchant reply (Phase 5.1)
- `publishedAt` — optional
- `createdAt`
- `updatedAt`

Required indexes:

- `(shopId, status, createdAt)`
- `(shopId, shopifyProductId, status, createdAt)`
- `(shopId, shopifyProductId, status, rating, createdAt)`
- `(shopId, shopifyProductId, status, hasImage, createdAt)`
- `(shopId, shopifyProductId, status, hasVideo, createdAt)`

Repository queries must always include `shopId`. Storefront reads return only
approved reviews.

### WidgetSettings

One row per shop for the MVP widget.

Current fields:

- `id`
- `shopId` — unique
- `widgetEnabled`
- `accentColor` — default `#0f766e` (matches theme extension)
- `primaryButtonColor` — default `#0f766e`
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
- `storageKey` — durable S3/local object key (source of truth for media location)
- `url` — write-through public URL for NOT NULL compatibility; reads build
  from `storageKey` + `MEDIA_PUBLIC_BASE_URL` (or `/api/media/*` locally)
- `mimeType`
- `sizeBytes`
- `width` / `height` — optional
- `position`
- `createdAt`
- `updatedAt`

Indexes: `(shopId, reviewId)`, `(reviewId, position)`, `(shopId, createdAt)`.

Limits (enforced in service): up to 5 images and 1 video per review; images
and videos ≤10 MB each. Production uses S3-compatible storage (AWS S3; also
compatible with Cloudflare R2); local development can use disk under
`storage/media` served at `/api/media/*`.

### ProductRatingSummary

Denormalized approved-review aggregates per product for the storefront Review
Summary Theme App Extension. Product pages read this row; they do not
`groupBy` reviews on every request.

Current fields:

- `id`
- `shopId`
- `shopifyProductId`
- `averageRating` — nullable when `totalReviews` is 0
- `totalReviews`
- `fiveStar` / `fourStar` / `threeStar` / `twoStar` / `oneStar`
- `createdAt`
- `updatedAt`

Unique: `(shopId, shopifyProductId)`.

Recomputed when approved reviews change (create/approve/reject/delete/import).
Storefront summary uses recompute-on-miss if a row is absent.

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

## Phase 5.3 Tables

### IncentiveCampaign

Post-review growth offers (coupon code paste + referral prompt). Not a coupon
engine — merchants enter an existing Shopify discount code.

Fields:

- `id`, `shopId`
- `name` — merchant label (default “Post-review offer”)
- `type` — `POST_REVIEW` (extensible for future campaign types)
- `status` — `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`
- Coupon: `couponEnabled`, `couponCode`, `couponHeadline`, `couponDescription`
- Referral: `referralEnabled`, `referralMessage`, `referralCtaLabel`,
  `referralCtaUrl`
- Thank-you: `thankYouTitle`, `thankYouBody`
- Future A/B: `weight`, `experimentKey`, `startsAt`, `endsAt`
- `createdAt`, `updatedAt`

Indexes: `(shopId, type, status)`, `(shopId, experimentKey)`.

MVP: at most one usable `POST_REVIEW` campaign per shop (service upserts a
single row; master enable maps to `ACTIVE` / `PAUSED`). Coupon codes are never
returned on storefront GET; they may appear only after a successful review
submit.

## Phase 5 — Integrations

Tenant-scoped third-party connections (not a generic integration platform).

### IntegrationConnection

- `id`, `shopId`
- `provider` — `KLAVIYO` | `GORGIAS`
- `status` — `DISCONNECTED` | `CONNECTED` | `ERROR`
- `credentialsEncrypted` — AES-256-GCM ciphertext (never returned to clients)
- `credentialsKeyVersion`
- `metadata` — non-secret JSON (e.g. account label, last tested at)
- `lastError`, `lastSuccessAt`, `connectedAt`
- `createdAt`, `updatedAt`

Unique `(shopId, provider)`.

### IntegrationExternalRef

Links app entities to remote IDs (e.g. Gorgias tickets):

- `provider`, `entityType` (`REVIEW` | `REVIEW_REQUEST`)
- `entityId`, `externalId`, `externalType` (`TICKET` | `EVENT`)

Unique `(shopId, provider, entityType, entityId, externalType)`.

## Phase 5.5 — Public API tokens

### ApiToken

Per-shop API credentials for `/api/v1` (server-to-server):

- `id`, `shopId`, `name`
- `tokenPrefix` — display fragment (not the secret)
- `tokenHash` — SHA-256 of the full Bearer token (never store plaintext)
- `lastUsedAt`, `revokedAt`
- `createdAt`, `updatedAt`

Unique on `tokenHash`. Indexes: `(shopId, revokedAt)`, `tokenPrefix`.
Cascade delete with `Shop` (also deleted explicitly on `shop/redact`).

### UninstallFeedback

Optional in-app exit survey captured before the merchant continues to Shopify
Admin uninstall (Shopify still shows its own mandatory reason modal on Apps →
Uninstall; Partner Dashboard / Partner API hold those platform reasons).

Fields:

- `id`, `shopId`
- `reasons` — string array of reason codes (Shopify-aligned list)
- `details` — optional free text (required when `other` is selected; max 250)
- `createdAt`

Index: `(shopId, createdAt)`. Cascade delete with `Shop`.

### ReviewSource

Adds `API` for reviews submitted through the public REST API.

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
  merchant review data until `shop/redact`. Optional in-app
  `UninstallFeedback` rows are retained with the shop until redaction.
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
