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

Phase 1 connects this existing model to installation, reinstallation, and
uninstall workflows.

## Phase 1 Tables

### Review

The core product-review record.

Planned fields:

- `id`
- `shopId`
- `shopifyProductId`
- `shopifyCustomerId` — optional
- `rating` — integer constrained to 1–5
- `title` — optional
- `body`
- `authorName`
- `authorEmail` — optional and never exposed publicly
- `status` — `PENDING`, `APPROVED`, or `REJECTED`
- `source` — `STOREFRONT`, `MERCHANT`, or `IMPORT`
- `verifiedPurchase`
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

Planned fields:

- `id`
- `shopId` — unique
- `accentColor`
- `showReviewForm`
- `reviewsPerPage`
- `createdAt`
- `updatedAt`

Prefer explicit columns for stable MVP settings. Introduce a versioned JSON
configuration only if later widget types need substantially different shapes.

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

## Tables Deferred Until a Feature Needs Them

- `ReviewMedia`
- `ReviewReply`
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

- Define merchant uninstall retention before public launch.
- Provide deletion/export workflows required by Shopify and applicable law.
- Store only customer data required for review and email-request workflows.
- Do not log review text, email addresses, access tokens, or import contents.
