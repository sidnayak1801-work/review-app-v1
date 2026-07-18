# Changelog

This file records completed changes only. Planned work belongs in
`04_ROADMAP.md`.

## Unreleased

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
