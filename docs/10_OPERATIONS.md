# Operations

Operator procedures for production readiness. Deployment steps:
`12_DEPLOYMENT.md`. Merchant pilot setup: `13_MERCHANT_SETUP.md`.

## Health and uptime

- Liveness: `GET /health` → `{ ok: true, status: "alive" }`
- Readiness: `GET /health?ready=1` → checks PostgreSQL with `SELECT 1`
- Point an external uptime monitor at `/health?ready=1` every 1–5 minutes
- Alert on non-2xx or sustained 503 responses

## Logging and error monitoring

- Application logs are structured JSON via `app/services/logger.server.ts`
- Never log access tokens, review bodies, customer emails, or import CSV contents
- Compliance webhook handlers log shop domain, resource IDs, and counts only
- Ship stdout/stderr from the production process to your host’s log drain
  (Fly, Railway, Render, CloudWatch, etc.)
- Recommended next step before broader launch: attach an error tracker
  (for example Sentry) using an environment DSN — not required for the pilot
  if log drain + uptime alerts are configured

## Rate limiting and abuse controls

- Storefront review create: 8 requests / minute / shop+IP
- Review-request token GET/POST: 8 requests / minute / IP
- In-memory limiter (per process). For multi-instance production, replace with
  a shared store (Redis) before scaling horizontally

## Backup and restore

- Primary database: Neon PostgreSQL (or equivalent managed Postgres)
- Enable continuous/PITR backups on the production project
- Weekly: verify a restore to a scratch branch/database
- Application secrets live in the host’s secret store, not in the repo
- After restore: run `npx prisma migrate status` and confirm webhook URLs still
  match the live `SHOPIFY_APP_URL`

## Data export (merchant / customer)

### Merchant review export (manual MVP)

Until a self-serve export UI ships (Phase 5 / ideas backlog):

1. Identify the shop by `shopDomain`
2. Export `Review` rows for that `shopId` (SQL or Prisma script)
3. Deliver CSV/JSON to the merchant over a secure channel

### Customer data request (`customers/data_request`)

1. Shopify sends the verified compliance webhook
2. Handler matches reviews by `authorEmail` / `shopifyCustomerId` and review
   requests by `customerEmail`
3. Logs list matching record IDs (no PII in logs)
4. Operator fulfills the merchant’s request within 30 days by exporting those
   IDs via `PrivacyService.collectCustomerDataExport` or equivalent SQL

## Deletion and redaction

| Event | Behavior |
| --- | --- |
| `app/uninstalled` | Shop marked `UNINSTALLED`; sessions deleted; reviews retained |
| `customers/redact` | Review author name anonymized; email/customer ID cleared; review requests cancelled and email redacted |
| `shop/redact` | Sent ~48h after uninstall; deletes the Shop row (cascade reviews, imports, requests, widget settings) and remaining sessions |

## Retention policy (MVP)

- Installed shops: retain reviews and review-request metadata while the shop is
  active and needed for moderation/display
- Uninstalled shops: retain merchant-owned review data until `shop/redact`
- After `shop/redact`: hard delete shop-scoped application data
- Do not delete data solely because of Free→Pro downgrade
- Import job rows follow shop cascade deletion

## Query plans and indexes

Current indexes match active query patterns:

- `Review (shopId, status, createdAt)` — moderation queues
- `Review (shopId, shopifyProductId, status, createdAt)` — storefront lists
- `ReviewRequest (status, scheduledAt)` — due email processing
- `ReviewRequest (shopId, createdAt)` — merchant history
- `ReviewImport (shopId, createdAt)` — import history
- Unique `(shopId, shopifyOrderId, shopifyProductId)` — idempotent scheduling

Before scaling past the pilot: run `EXPLAIN (ANALYZE, BUFFERS)` on list and due
queries with representative tenant data; add indexes only for measured gaps.

## Storefront performance notes

- Theme App Extension loads a small JS/CSS asset; reviews fetch via app proxy
- Responses return approved public fields only, cursor-paginated
- Default page size comes from widget settings (`reviewsPerPage`, default 5)
- Keep payloads small; avoid embedding full order/customer objects
- Target: storefront Lighthouse impact under Shopify’s “≤10 point drop” BFS bar
  (measure on a representative product page before App Store submission)

## Admin performance notes

- Embedded admin uses App Bridge / Polaris web components
- Measure LCP / CLS / INP in Partner Dashboard after public traffic exists
  (BFS requires enough samples over 28 days)

## CI

- GitHub Actions workflow `.github/workflows/ci.yml` runs `npm run check`
  (lint, typecheck, tests, build) on push/PR
