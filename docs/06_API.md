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

These routes use Shopify request verification.

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
  - Creates a pending review
  - Applies validation, rate limiting, and spam protection

The public storefront contract uses the Shopify app proxy:

- Storefront path: `/apps/reviews`
- App route: `/api/storefront/reviews`
- Authenticated with `authenticate.public.appProxy`
- Query `productId` (numeric or GID) for approved reviews
- POST creates a pending storefront review with honeypot and rate limiting

Choose the final Shopify app-proxy URL when implementing the Theme App
Extension and document it before release.

## Phase 2 — Requests, Moderation, Imports, and Billing

Moderation continues to use the Phase 1 review update route.

- `POST /webhooks/orders/fulfilled`
  - Verified Shopify webhook
  - Creates idempotent review-request schedules
- `GET /api/admin/review-requests`
  - Paginated request status for the authenticated shop
- `POST /api/admin/review-imports`
  - Accepts a bounded CSV upload and creates an import job
- `GET /api/admin/review-imports/:importId`
  - Returns progress, counts, and a safe error-report link

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
