# Review App Roadmap

The roadmap is ordered to launch a useful MVP before expanding the platform.
Only the active phase may be implemented. Future phases preserve direction;
they are not current requirements.

Status: ⏳ Not Started · 🚧 In Progress · ✅ Completed

## MVP Milestone

The MVP spans Phases 0–3, includes Free and Pro plans, and targets an initial
cohort of 50–100 Shopify stores.

## Phase 0 — Foundation

Status: ✅ Completed

Objective: establish a small production-quality base without building product
features early.

Completed:

- [x] Audit the Shopify CLI project
- [x] Remove unused starter code
- [x] Move Prisma persistence from SQLite to Neon PostgreSQL
- [x] Add runtime environment validation
- [x] Add structured logging, Zod parsing, and domain errors
- [x] Establish route, service, repository, and Prisma boundaries
- [x] Add the Shop model and core repository/service
- [x] Preserve Shopify session storage and lifecycle webhooks
- [x] Add an authenticated Polaris dashboard shell
- [x] Add focused unit and repository integration tests

Definition of done:

- The app authenticates and loads in Shopify Admin.
- Prisma connects to PostgreSQL.
- Quality checks pass.
- Product features remain outside the foundation.

## Phase 1 — Core Reviews and Widget

Status: ✅ Completed

Objective: complete the first end-to-end product-review path.

Scope:

### Authentication and Shop Lifecycle

- [x] Connect successful Shopify authentication to Shop installation/reinstall
- [x] Track uninstall state while preserving merchant-owned data
- [x] Handle scope updates and idempotent lifecycle events

### Database

- [x] Add Review and WidgetSettings models only
- [x] Add tenant, product, status, and time-based indexes
- [x] Add focused migrations and repository integration tests

### Review CRUD

- [x] Add review schemas, repository, and service
- [x] Add authenticated review list and detail UI
- [x] Create, edit, and delete reviews
- [x] Add cursor pagination and basic product/status filters
- [x] Add customer review submission with validation and spam controls

### Review Widget

- [x] Add a Theme App Extension
- [x] Render approved product reviews
- [x] Add a star-rating badge
- [x] Keep the widget accessible, responsive, and lightweight

### Merchant Settings

- [x] Enable or disable the submission form
- [x] Configure accent color and reviews per page
- [x] Add setup guidance for enabling the extension

Definition of done:

- A merchant can install the app, configure the widget, create a review, and
  display an approved review on a product page.
- A customer can submit a pending review.
- Tenant isolation and public endpoint protections are tested.

Not in this phase:

- Email requests
- Moderation workflow UI beyond the stored review status
- Imports
- Media, replies, billing, analytics, AI, or integrations

## Phase 2 — Launch Features

Status: ✅ Completed

Objective: add the workflows required to operate reviews for real merchants.

### Email Requests

- [x] Request the minimum Shopify scopes required for fulfilled orders
- [x] Handle fulfillment events idempotently
- [x] Schedule one review-request email per order product
- [x] Integrate one email provider behind a small provider boundary
- [x] Track sent, failed, cancelled, and completed states
- [x] Add bounded retries and merchant-visible delivery status

### Moderation

- [x] Add pending, approved, and rejected queues
- [x] Add single-review approve/reject actions
- [x] Add safe bulk approve/reject for selected reviews
- [x] Ensure only approved reviews are public

### Import Reviews

- [x] Define and document the supported CSV format
- [x] Validate file size, headers, rows, and tenant ownership
- [x] Process imports in bounded batches
- [x] Show progress and provide a downloadable error report
- [x] Prevent duplicate import submissions

### Pricing and Billing

- [x] Configure Free and Pro plans with Shopify App Pricing
- [x] Set Pro pricing to `$19/month` with a 14-day trial
- [x] Enforce published-review allowances server-side (Free plan cap in moderation)
- [x] Centralize server-side entitlement checks (published-review allowance service)
- [x] Sync plan changes and cancellation state from Shopify
- [x] Implement upgrade, downgrade, and failed-payment behavior
- [ ] Test Shopify-hosted plan selection and billing transitions
- [x] Enforce review-request email allowances

Definition of done:

- A merchant can request, receive, moderate, import, and publish reviews without
  developer assistance.
- A merchant can select Free or Pro and change plans without contacting support
  or reinstalling the app.
- Plan limits are enforced server-side without deleting or unexpectedly hiding
  existing reviews.
- Failures are visible and retryable.
- The complete merchant and customer workflows have automated coverage.

Not in this phase:

- Multiple email campaigns
- Advanced automation
- Photos or video
- AI moderation

## Phase 3 — Performance, Polish, and Production Readiness

Status: 🟡 In Progress (production readiness through BFS gap record; deploy/pilot deferred)

Objective: make the MVP safe and supportable for the first 50–100 merchants.

Do not add Judge.me-parity product features (configurable delays, multi-product
emails, in-email forms, SMS, incentives) in this phase. Those belong in Phase 4+
after production readiness.

Tasks:

- [x] Complete onboarding, empty, loading, error, and uninstall states
- [x] Verify accessibility and responsive behavior
- [x] Measure and optimize storefront payload and response time
- [x] Review query plans and required indexes with representative data
- [x] Add rate limiting and abuse controls
- [x] Add unit, integration, and critical-path end-to-end tests
- [x] Add CI, error monitoring, uptime checks, and production logging
- [x] Document backup, restore, data export, deletion, and retention procedures
- [x] Complete Shopify security and app-submission checks
- [x] Classify the listing under Product reviews and complete its structured
  category details
- [x] Verify the latest App Bridge, Polaris UX, navigation, and accessibility
  requirements
- [x] Verify Theme App Extension behavior without direct theme-code edits
- [x] Measure against Shopify's current admin and storefront performance
  requirements
- [x] Verify Shopify App Pricing, plan transitions, and billing disclosures
- [x] Check current Built for Shopify requirements and record remaining
  eligibility gaps
- [ ] Deploy production infrastructure and run a small merchant pilot
  (Fly config + Dockerfile in repo; Fly login done; **blocked on Fly org
  billing** — add a card at https://fly.io/dashboard/algorithmtrix/billing
  then `fly apps create` / `fly deploy` per `12_DEPLOYMENT.md`)
- [x] Write operator and merchant setup documentation
  (`12_DEPLOYMENT.md`, `13_MERCHANT_SETUP.md`)

See `10_OPERATIONS.md` and `11_APP_STORE_AND_BFS.md` for procedures and remaining
eligibility gaps (including Product reviews Flow trigger and customer admin
block requirements for BFS).

Definition of done:

- Production checks pass.
- Core workflows are monitored and recoverable.
- The app can be installed and used by pilot merchants without developer setup.
- Production infrastructure is deployed, a small merchant pilot has run, and
  operator plus merchant setup documentation is written.
- The MVP has no known critical security, data-loss, or storefront-performance
  issue.
- The app follows Built for Shopify quality traits, without claiming the status
  before Shopify awards it.

## Validation Gate

Do not begin broad post-MVP development until real usage is reviewed.

Evaluate:

- Installation-to-widget activation
- Time to first displayed review
- 30-day merchant activity
- Review submission and moderation volume
- Email delivery and import failure rates
- Free-to-Pro conversion, downgrades, and cancellations
- Support requests and repeated merchant requests
- Database and storefront performance

Use evidence from this cohort to reorder post-MVP phases.

### Built for Shopify Application Gate

Built for Shopify cannot be guaranteed at MVP launch. Apply only after:

- Shopify App Store requirements remain satisfied.
- The Partner account is in good standing.
- Shopify's current minimum net-install threshold is met.
- The app has the required number of reviews and recent rating.
- Technical, design, performance, integration, billing, and any applicable
  category-specific checks pass.

Verify the current criteria in the Partner Dashboard and official requirements
page; thresholds can change.

## Phase 4 — High-Value Growth

Status: ✅ Completed (review-request DoD; optional growth candidates deferred)

Objective: deepen review acquisition and merchant control after the MVP is
stable in production.

### Review-request improvements

- [x] Merchant-configurable review-request delay (Free: one global delay,
  1–14 days, default 3; Pro: separate domestic and international delays,
  1–30 days each)
- [x] Multi-product review-request email — one email per order listing products
  (Free: up to 5 products listed; Pro: all products on the order)
- [x] Email reminders and templates

### Other growth candidates

- [x] Photo reviews (and video) — `ReviewMedia`, R2 uploads, widget media step
- Merchant replies
- Review export
- Basic SEO aggregate-rating markup
- Store-level reviews
- Additional widget translation controls

Not in this phase:

- In-email interactive review forms
- SMS or push review requests
- Coupons or incentives for completed reviews

Build only features validated by merchant demand. Billing details are in
`09_BILLING.md`.

Definition of done:

- [x] Merchants can configure review-request delay within plan limits, and
  scheduled emails respect those delays.
- [x] One multi-product review-request email is sent per eligible order within
  Free/Pro product-listing limits.
- [x] Reminder and template behavior for review requests is merchant-usable and
  failures are visible/retryable.
- [x] Plan entitlements for Phase 4 review-request features are enforced
  server-side without deleting existing reviews.
- Optional growth candidates in this phase ship only with merchant evidence,
  tests, and docs; Phase 5+ items remain out of scope.

## Phase 5 — Insights and Ecosystem

Status: 🚧 In Progress (Phase 5.2 Q&A shipped; further ecosystem candidates open)

Candidate scope:

- [x] Useful review trends and product insights — `/app/products/:id` health
  dashboard (Shopify metadata, stats, rating mix, volume/rating trends, AI
  placeholders, product-scoped Publish/Hide/Feature/Reply/Delete). Entry only
  via product name links; no Products nav.
- [x] Merchant replies + featured flag on reviews (admin + storefront widget)
- [x] Questions and answers — Phase 5.2: `Question` model, `/app/questions`
  moderation (Approve/Hide/Answer/Delete), storefront Q&A block +
  `/apps/reviews/qa` proxy, merchant email on new questions, shared
  moderation utilities
- Coupons and referral prompts
- Klaviyo and Gorgias integrations (including SMS-oriented channels)
- Public or partner API
- Review syndication
- ~~Video reviews~~ (shipped with photo reviews in Phase 4 growth)

Avoid an analytics warehouse or integration platform until volume requires it.

Definition of done:

- At least one insights or ecosystem capability from this phase’s validated
  candidate list is live for merchants end-to-end.
- Integrations and APIs (if built) use stable, documented contracts with
  tenant isolation and safe error handling.
- Growth tools such as coupons or Q&A (if built) enforce entitlements and do
  not break core review moderation or storefront display.
- No analytics warehouse or generic integration platform is introduced without
  measured volume need.

## Phase 6 — Platform Scale and Experiments

Status: ⏳ Future

Candidate scope:

- Advanced analytics
- AI summaries, moderation, sentiment, and translation
- Additional messaging and social integrations
- Loyalty integrations
- Enterprise roles, SLA, white-label, and custom integrations
- Dedicated queues, caching, read replicas, partitioning, or service extraction
  when measurements justify them

Experimental features require a measurable hypothesis and a low-cost test
before full implementation.

Definition of done:

- Platform or experimental work ships only against a measured need or explicit
  hypothesis with a low-cost test first.
- Advanced analytics, AI, or enterprise features (if built) preserve tenant
  isolation, MVP module boundaries, and existing merchant workflows.
- Scale infrastructure (queues, caches, replicas, service extraction) is added
  only when measurements justify it—not by default.
- Experimental features can be disabled or rolled back without data-loss risk
  to core reviews.
