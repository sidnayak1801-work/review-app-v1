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

Status: 🚧 In Progress

Objective: add the workflows required to operate reviews for real merchants.

### Email Requests

- [ ] Request the minimum Shopify scopes required for fulfilled orders
- [ ] Handle fulfillment events idempotently
- [ ] Schedule one review-request email per order product
- [ ] Integrate one email provider behind a small provider boundary
- [ ] Track sent, failed, cancelled, and completed states
- [ ] Add bounded retries and merchant-visible delivery status

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
- [ ] Enforce review-request email allowances

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

Status: ⏳ Not Started

Objective: make the MVP safe and supportable for the first 50–100 merchants.

Tasks:

- [ ] Complete onboarding, empty, loading, error, and uninstall states
- [ ] Verify accessibility and responsive behavior
- [ ] Measure and optimize storefront payload and response time
- [ ] Review query plans and required indexes with representative data
- [ ] Add rate limiting and abuse controls
- [ ] Add unit, integration, and critical-path end-to-end tests
- [ ] Add CI, error monitoring, uptime checks, and production logging
- [ ] Document backup, restore, data export, deletion, and retention procedures
- [ ] Complete Shopify security and app-submission checks
- [ ] Classify the listing under Product reviews and complete its structured
  category details
- [ ] Verify the latest App Bridge, Polaris UX, navigation, and accessibility
  requirements
- [ ] Verify Theme App Extension behavior without direct theme-code edits
- [ ] Measure against Shopify's current admin and storefront performance
  requirements
- [ ] Verify Shopify App Pricing, plan transitions, and billing disclosures
- [ ] Check current Built for Shopify requirements and record remaining
  eligibility gaps
- [ ] Deploy production infrastructure and run a small merchant pilot
- [ ] Write operator and merchant setup documentation

Definition of done:

- Production checks pass.
- Core workflows are monitored and recoverable.
- The app can be installed and used by pilot merchants without developer setup.
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

Status: ⏳ Future

Candidate scope:

- Merchant replies
- Photo reviews
- Review export
- Email reminders and templates
- Basic SEO aggregate-rating markup
- Store-level reviews
- Additional widget layout and translation controls

Build only features validated by merchant demand. Billing details are in
`09_BILLING.md`.

## Phase 5 — Insights and Ecosystem

Status: ⏳ Future

Candidate scope:

- Useful review trends and product insights
- Questions and answers
- Coupons and referral prompts
- Klaviyo and Gorgias integrations
- Public or partner API
- Review syndication
- Video reviews

Avoid an analytics warehouse or integration platform until volume requires it.

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
