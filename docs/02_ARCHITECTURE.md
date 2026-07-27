# Architecture

## Architecture Goal

Use the simplest architecture that can launch to 50–100 stores while
preserving clear boundaries for later growth.

The application is a modular monolith:

- One React Router application
- One PostgreSQL database
- One Theme App Extension
- One deployment unit

Do not introduce microservices, event sourcing, Kubernetes, a distributed
event bus, or separate read/write systems before measured scale requires them.

## High-Level Flows

Merchant administration:

```text
Shopify Admin
  → Authenticated React Router route
  → Feature service
  → Repository
  → Prisma
  → PostgreSQL
```

Storefront reviews:

```text
Theme App Extension
  → Public widget or submission endpoint
  → Validation and tenant resolution
  → Review service
  → Review repository
  → PostgreSQL
```

Review requests:

```text
Shopify order/fulfillment event
  → Webhook route
  → Review-request service
  → Database-backed schedule
  → Email provider
```

The MVP can process low-volume work in the application with a database-backed
schedule. Introduce a dedicated queue only when retries, throughput, or
deployment topology make it necessary.

## MVP Modules

- Authentication and Shopify sessions
- Shop management
- Review management and moderation
- Widget configuration
- Storefront review API
- Review-request emails
- CSV imports
- Shopify App Pricing and plan entitlements

Post-MVP modules such as advanced analytics, media, AI, and broad
integrations must not shape the MVP implementation beyond stable identifiers
and clear module boundaries.

Billing remains small: Shopify hosts plan selection and is the subscription
source of truth. The app centralizes server-side entitlement checks and avoids
a generic billing or usage-metering subsystem.

## Project Structure

```text
app/
  components/       Shared presentational UI used by multiple features
  features/         Feature services, schemas, and feature-owned UI
                    (reviews, products insights, billing, imports, …)
  lib/              Small framework-independent utilities and errors
  repositories/     Prisma-backed database access
  routes/           HTTP loaders, actions, webhooks, and API entry points
  services/         Shared infrastructure adapters
  types/            Truly cross-feature TypeScript types
extensions/         Shopify extensions; storefront widget starts in Phase 1
prisma/             Schema and migrations
docs/               Product and engineering documentation
```

Do not create empty folders or wrappers only to match the diagram. Add a
folder or abstraction when real code needs it.

## Layer Responsibilities

### Routes

- Authenticate requests
- Parse and validate transport input
- Call one or more services
- Translate results and known errors into responses

Routes must not contain business rules or Prisma queries.

### Services

- Apply feature rules and workflows
- Enforce tenant ownership
- Coordinate repositories and external providers
- Define transaction boundaries when multiple writes must succeed together

Create an interface when there are multiple implementations, an external
provider boundary, or a clear testing need. Do not create interfaces for every
class by default.

### Repositories

- Own all Prisma queries
- Select only required fields
- Apply pagination and stable ordering
- Keep tenant filters explicit

Repositories must not contain HTTP or UI behavior.

### Components

- Render accessible merchant UI
- Receive data and callbacks through props
- Avoid business and persistence logic

Use Polaris and App Bridge for the embedded admin. Keep storefront extension
code lightweight and independent from merchant administration code.

## Data Ownership

Shopify is the source of truth for:

- Products and variants
- Customers
- Orders and fulfillment

The application stores Shopify IDs needed for relationships but does not copy
complete Shopify resources.

The application owns:

- Shops and app settings
- Reviews and moderation state
- Widget settings
- Review-request schedules and delivery state
- Import jobs and import errors
- A minimal cached plan entitlement when required for request-time checks

OAuth credentials remain in Shopify session storage and are never duplicated
on the Shop record.

## Built for Shopify Design Target

The listing category is Product reviews. Built for Shopify is a separately
earned status, so the architecture must support its quality criteria without
claiming the badge prematurely.

- Use the latest supported App Bridge and Shopify-native embedded patterns.
- Use Polaris and Shopify navigation conventions for merchant workflows.
- Use Theme App Extensions and never edit theme code directly.
- Keep the storefront integration small and load assets only where needed.
- Design accessible, responsive, high-quality onboarding and resource screens.
- Track admin and storefront performance against Shopify's current
  requirements.
- Keep scopes minimal and integrations compliant with App Store requirements.

Re-check the official requirements before App Store submission and before
applying for Built for Shopify because Shopify updates them over time.

## Tenant Isolation

Every merchant-owned record must include or resolve to `shopId`.

- Authenticated routes derive the shop from the Shopify session.
- Public widget/submission endpoints resolve the shop from a signed or otherwise
  verified storefront context.
- Repository queries include the tenant boundary.
- IDs from client input are never sufficient authorization.

## Reliability and Security

For the MVP:

- Validate external input with Zod.
- Verify Shopify webhooks and authenticated requests.
- Make webhook handlers idempotent.
- Store import and email failures with retryable status.
- Use structured logs without secrets or customer content.
- Return safe public errors and log internal context.
- Add rate limiting and basic spam protection before public launch.

## Performance Strategy

Start with:

- PostgreSQL indexes for tenant, product, status, and time-based queries
- Cursor pagination for growing review lists
- Small storefront payloads
- CDN/browser caching for public reads where HTTP semantics allow it
- Batched Shopify GraphQL requests

Add Redis, read replicas, partitioning, a dedicated queue, or separate services
only after measurements identify a bottleneck. These are extension points, not
MVP dependencies.

## Deployment Shape

The MVP needs:

- One application deployment
- One managed PostgreSQL database
- One email provider
- Scheduled execution for review requests
- Shopify App Pricing with Free and Pro plans
- Error monitoring and basic uptime checks

Horizontal application scaling remains possible because durable application
state lives in PostgreSQL or Shopify, not process memory.

## Shop Lifecycle Runtime

Shopify OAuth `afterAuth` installs or reinstalls the Shop record by
`shopDomain`. The App Uninstalled webhook marks the shop `UNINSTALLED` and then
clears sessions. Merchant-owned data is retained. Scope updates continue to
update Shopify session storage only.

Authenticated admin loaders may call `shopService.install` as a safety net when
a session exists without a Shop row yet.

## Phase 1 Storefront Runtime

Theme App Extension blocks call the app proxy at `/apps/reviews`, which maps to
`/api/storefront/reviews`. The proxy resolves the shop from Shopify verification,
returns approved public reviews, and accepts pending storefront submissions.

Customer identity, review `source`, verified-buyer determination, and
guest/logged-in submission UX are defined in `14_REVIEW_SUBMISSION_SPEC.md`.
Future submission changes must follow that specification and keep verification
logic centralized in services (not duplicated in the widget or routes).

## Phase 5 Integrations Runtime

Third-party providers implement `IntegrationProvider` and register in
`app/services/integrations/`. Per-shop credentials live in
`IntegrationConnection` (AES-256-GCM encrypted). Domain services emit events
through `IntegrationEventDispatcher` without blocking core workflows.

## Open MVP Risks

- App-proxy storefront traffic and Theme App Extension loading should still be
  measured on a real product page during the Phase 3 pilot (notes in
  `10_OPERATIONS.md` and `11_APP_STORE_AND_BFS.md`).
- Scheduled email and import processing must remain reliable across deploys;
  the MVP database-backed approach needs explicit retry and locking behavior
  before horizontal scale.
- Built for Shopify Product reviews category still requires a Flow trigger and
  customer admin block (`11_APP_STORE_AND_BFS.md`).
- Performance targets remain provisional until representative review data and
  real storefront/admin traffic are measured in production.
- Public App Store distribution and protected customer data access remain
  Partner Dashboard prerequisites for production billing and order email.
