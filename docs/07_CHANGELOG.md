# Changelog

This file records completed changes only. Planned work belongs in
`04_ROADMAP.md`.

## Unreleased

- Storefront widget reviews require a signed-in Shopify customer
  (`logged_in_customer_id`); guests see a sign-in/sign-up wall. Review-request
  email token submissions remain allowed without storefront login. Removed the
  merchant admin “Add review” test form.
- Phase 4 review-request improvements: configurable Free/Pro delays, one
  multi-product email per order (Free ≤5 / Pro all), editable templates, and
  one reminder email with monthly credit counting by order + reminder.
- Added Fly.io production host config (`fly.toml`, multi-stage Dockerfile,
  `.dockerignore`) and `scripts/set-fly-secrets.mjs`. Live `fly deploy` is
  blocked until the Fly organization has billing enabled.
- Added Fly.io deployment runbook and merchant pilot setup docs
  (`12_DEPLOYMENT.md`, `13_MERCHANT_SETUP.md`).
- Phase 3 production readiness (through BFS gap record, deploy deferred):
  mandatory privacy compliance webhooks, public API rate limits, `/health`,
  CI, onboarding/uninstall polish, operations/retention docs, and App Store /
  Built for Shopify eligibility gap checklist.
- Documented Phase 4 review-request roadmap: configurable delays and
  multi-product emails with Free/Pro limits; kept Phase 3 free of Judge.me
  parity product features.
- Added sample CSV download and format guide on the imports page.
- Added review-request emails: fulfillment webhook scheduling, Resend/console
  email provider, token-based submission, merchant status UI, and monthly
  allowances (Free 50 / Pro 1,000).
- Added Shopify billing sync, Pro upgrade flow, and `/app/billing` with Free and
  Pro published-review allowances (100 / 5,000).
- Added CSV review import with validation, bounded batch processing, import job
  history, and downloadable row-level error reports at `/app/imports`.
- Added moderation queues with pending, approved, and rejected counts on the
  reviews page.
- Added bulk approve/reject actions with partial-success messaging and Free-plan
  published-review limit feedback.
- Added server-side published-review entitlement checks for single and bulk
  approval flows.
- Completed Phase 1 review CRUD, widget settings, storefront app proxy, and
  Theme App Extension blocks.
- Wired Shopify `afterAuth` to idempotent Shop install/reinstall.
- Uninstall webhook marks shops `UNINSTALLED` without deleting Shop records.
- Dashboard shows Shop lifecycle status from the database.
- Reframed project documentation around a 50–100-store MVP.
- Consolidated the roadmap into four MVP phases and deferred expansion work.
- Limited the database and API plans to tables and contracts needed by active
  MVP phases.
- Classified features as Must Have, Should Have, Nice to Have, Future, or
  Experimental.
- Simplified agent guidance to prefer the simplest correct solution.
- Added Free and Pro pricing to the MVP using Shopify App Pricing.
- Added Product reviews category positioning and Built for Shopify quality
  requirements without claiming unearned status.

## 0.2.0 — 2026-07-17

- Established embedded React Router authentication and a Polaris dashboard
  shell.
- Configured Prisma and Neon PostgreSQL with an applied baseline migration.
- Added the Shop model and its core repository/service without lifecycle
  wiring.
- Preserved Shopify session cleanup and scope-update handling.
- Added runtime environment validation, structured logging, Zod validation,
  domain errors, and focused tests.
- Removed unused Shopify starter demonstrations.

## 0.1.0

- Created the initial architecture, project documentation, and Cursor rules.
