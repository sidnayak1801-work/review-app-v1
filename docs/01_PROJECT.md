# Review App

## Product Direction

Build a focused Shopify product-review app that a solo developer can launch,
support, and improve for the first 50–100 merchants.

The immediate goal is not feature parity with Judge.me. The goal is to solve
the core review workflow reliably:

1. A merchant installs the app.
2. Customers submit product reviews.
3. The merchant moderates those reviews.
4. Approved reviews and ratings appear on the storefront.
5. The merchant can request and import reviews.

If merchants adopt and retain the product, later phases can expand it into a
broader review platform without replacing the core architecture.

## Target Users

Primary:

- Small Shopify merchants
- Early-stage direct-to-consumer brands
- Stores moving from manual testimonials or basic review tools

Secondary after validation:

- Growing Shopify brands
- Shopify agencies
- Shopify developers

## MVP Scope

The launchable MVP includes:

- Shopify authentication and shop lifecycle
- Product review creation, reading, updating, and deletion
- Basic moderation: pending, approved, and rejected
- One product review widget with star ratings
- Basic merchant widget settings
- Customer review submission with validation and spam protection
- Review request emails
- CSV review import
- Free and Pro plans through Shopify App Pricing
- Basic operational logging, error handling, and production checks

The MVP does not include advanced analytics, AI features, loyalty, referrals,
video, multiple widget families, enterprise controls, or broad third-party
integrations.

See `05_FEATURES.md` for the complete priority classification.

## Product Principles

- Make installation and first value fast.
- Prefer one complete workflow over many partial features.
- Keep merchant controls understandable without training.
- Keep storefront code lightweight.
- Preserve merchant data and make imports/exports predictable.
- Use Shopify as the source of truth for products, customers, orders, and
  variants.

## Technical Principles

- Build a modular monolith.
- Use React Router, TypeScript, Prisma, PostgreSQL, Shopify GraphQL, App Bridge,
  Polaris, and Theme App Extensions.
- Keep routes thin, business rules in services, and database access in
  repositories.
- Add interfaces at real boundaries, not around every function.
- Design tenant isolation, pagination, and indexes from the start.
- Add queues, caches, and distributed systems only after measured need.

## Business Model

The MVP launches with two transparent plans:

- Free — core reviews and widget with clear usage limits
- Pro — higher review and email allowances for `$19/month`

Use Shopify App Pricing for plan selection and billing. Do not build a custom
checkout or generic metering platform.

See `09_BILLING.md` for plan limits, entitlement rules, and downgrade behavior.

## Shopify App Store Positioning

The app's intended Shopify App Store category is **Product reviews**.

**Built for Shopify** is an earned quality status, not an App Store category.
The MVP must be designed to satisfy its traits from the start:

- Native embedded administration using the latest supported App Bridge
- Polaris-based, accessible, responsive merchant UX
- Theme App Extensions without direct theme-code edits
- Fast admin and storefront performance
- Minimal scopes, verified Shopify requests, and correct data handling
- Clear onboarding, pricing, support, and error recovery
- Compliance with Shopify App Store and billing requirements

Do not display or claim the Built for Shopify status until Shopify awards it.
Eligibility also depends on real merchant utility, including Shopify's current
install, review, and rating thresholds.

Current requirements:
https://shopify.dev/docs/apps/launch/built-for-shopify/requirements

Remaining eligibility gaps for this app are tracked in
`11_APP_STORE_AND_BFS.md`.

## MVP Success Metrics

- At least 50 net installs from active shops on paid Shopify plans
- More than 80% successful installation-to-widget activation
- First approved review displayed within one day of install
- At least 30% of installed stores active after 30 days
- Review submission and moderation flows complete without manual intervention
- Free-to-Pro conversion and cancellation reasons are measurable
- At least five honest Shopify App Store reviews while maintaining Shopify's
  current Built for Shopify rating threshold
- Support volume remains manageable for one developer

## Long-Term Vision

Become a merchant-friendly review platform with richer media, analytics,
automation, AI, integrations, and enterprise capabilities. These ideas are
preserved in `08_IDEAS.md` and the post-MVP roadmap.
