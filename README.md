# Review App

A Shopify embedded product-review application built for an initial cohort of
50–100 merchants. The product is intentionally MVP-first while retaining clean
module boundaries for later growth.

## Current Status

Phase 0 — Foundation is complete:

- Shopify OAuth and Prisma session storage
- React Router, App Bridge, and Polaris dashboard shell
- Neon PostgreSQL and Prisma migrations
- Runtime environment validation, Zod parsing, structured logging, and domain
  errors
- Shop model, repository, and service core
- Focused unit and repository integration tests

Phase 1 is complete: shop lifecycle, review CRUD, widget settings, storefront
app-proxy API, and Theme App Extension blocks. Phase 2 covers email requests,
moderation queues, CSV import, and Free/Pro billing.

## MVP

The MVP is one complete workflow: install, collect/import, moderate, request,
display, and monetize product reviews. It includes Free and Pro plans through
Shopify App Pricing. Advanced analytics, AI, loyalty, referrals, enterprise
features, and broad integrations are post-MVP.

The intended App Store category is Product reviews. The app is designed around
Built for Shopify quality traits, but will not claim that status unless Shopify
awards it after the app meets current eligibility and review requirements.

See:

- `docs/01_PROJECT.md` — product direction and success criteria
- `docs/02_ARCHITECTURE.md` — modular-monolith boundaries
- `docs/04_ROADMAP.md` — phase scope and definitions of done
- `docs/05_FEATURES.md` — feature priorities
- `docs/TODO.md` — immediate next slice

## Prerequisites

- A Node.js version supported by `package.json`
- Shopify CLI
- A Shopify Partner development store
- A PostgreSQL database such as Neon

## Local Setup

1. Copy `.env.example` to `.env` and provide the database URLs.
2. Install dependencies with `npm install`.
3. Apply migrations with `npm run setup`.
4. Start Shopify development with `npm run dev`.

Shopify CLI supplies app credentials and the development URL during local
development.

## Quality Checks

```shell
npm run check
```

Set `TEST_DATABASE_URL` to an isolated PostgreSQL database to run repository
integration tests.

## Architecture

The app is a modular monolith. Routes handle HTTP and authentication, services
apply workflows, repositories own Prisma access, and PostgreSQL stores durable
application data. New infrastructure is added only when active features or
measured scale require it.
