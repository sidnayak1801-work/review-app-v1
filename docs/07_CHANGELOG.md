# Changelog

This file records completed changes only. Planned work belongs in
`04_ROADMAP.md`.

## Unreleased

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
