# Changelog

This file records completed changes only. Planned work belongs in
`04_ROADMAP.md`.

## Unreleased

- Moderation actions (Publish/Hide/Feature/Reply/Delete and Q&A Approve/Hide/
  Answer/Delete) open Polaris confirmation or input modals with loading states,
  inline errors, App Bridge success toasts, and local list updates without a
  full page reload. Merchant reply max length is 1000 characters.
- Phase 5.2 product Q&A: `Question` model (`PENDING` / `PUBLISHED` / `HIDDEN` /
  `ANSWERED`), merchant `/app/questions` moderation page, shared moderation
  toolbar utilities, storefront Q&A theme block, `/apps/reviews/qa` proxy API
  with honeypot + rate limits, and merchant email alerts on new questions.
- Product insight charts show month labels on the x-axis and rating/count ticks
  on the y-axis.
- Storefront widget shows Featured badges and merchant replies; public review
  payloads include `featured`, `merchantReply`, and `merchantReplyAt`.
- Phase 5.1 product health dashboard on `/app/products/:id`: summary stats,
  rating mix, volume and rating trend charts, sidebar timeline, AI insight
  placeholders, and in-page Publish/Hide/Feature/Reply/Delete (shared with
  Reviews). No Products nav.
- Added `Review.featured`, `merchantReply`, and `merchantReplyAt` for merchant
  feature/reply workflows.
- Simplified product insights: removed Products nav/list; product name links
  open a thin `/app/products/:id` page (metadata, key stats, moderation).
- Fixed review media thumbs breaking after tunnel restarts by rewriting
  `/api/media/...` URLs to the current app origin at read time; new local
  uploads store path-only media URLs.
- Merchant Reviews (and Home recent reviews) show the product name with a link
  to the product insights page. New storefront submissions snapshot
  `productTitle`; older reviews are enriched via Admin GraphQL `nodes`.
- Fixed embedded admin scrolling on mobile viewports (`html`/`body` overflow)
  and redesigned Home into a Judge.me-like workspace: setup guide with progress,
  pending/welcome callouts, richer overview stats, and card-style quick actions.
- Improved merchant Home mobile layout: responsive stats/quick-actions grids,
  stacked widget settings + preview under ~720px, and safer wrapping for long
  product IDs / activity rows.
- Merchant Reviews page: click review photo/video thumbnails to preview them
  in a Polaris modal gallery (prev/next) before Publish/Hide.
- Made merchant admin navigation feel faster: removed the global “Updating…”
  banner, kept Home content visible during transitions, skipped redundant
  parent-layout re-auth, and used the App Bridge loading indicator instead.
- Storefront review photos/videos open in an in-page lightbox with prev/next
  navigation instead of navigating to the raw media URL.
- Fixed storefront review submit failing with “Unable to submit review” when
  the widget POSTed multipart FormData (body was read twice after the media
  upload branch was added).
- Polished merchant admin UI (Home, Reviews, Requests, Imports, Billing,
  Widget settings) toward a Judge.me-like visual standard: denser cards,
  status badges, green stars, relative timestamps, and calmer headers.
- Upgraded Reviews moderation UX: All/Pending/Published/Rejected tabs with
  counts, richer review cards, bulk Publish/Hide bar, and clearer filters.
- Redesigned the merchant home dashboard into a workspace: stats cards, quick
  actions, recent reviews, synthesized activity feed, and embedded widget
  settings with live preview.
- Expanded `WidgetSettings` (layout, colors, radius, shadow, visibility
  toggles, auto-publish, dark mode, reviews per page 5/10/20/50) and applied
  them on the storefront widget.
- Photo/video review media (`ReviewMedia` + R2 uploads, with local disk
  fallback for development): widget media step, storefront display, and admin
  thumbnails (max 5 images + 1 video, 10 MB each).
- Pointed hosted app URL at Render (`review-app-v1.onrender.com`): updated
  `shopify.app.toml`, added `render.yaml`, and rewrote `12_DEPLOYMENT.md` for
  Render + Neon (Fly kept as optional always-on later). Disabled
  `automatically_update_urls_on_dev` so local tunnel does not break install.
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
