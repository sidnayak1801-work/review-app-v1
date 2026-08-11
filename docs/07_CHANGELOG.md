# Changelog

This file records completed changes only. Planned work belongs in
`04_ROADMAP.md`.

## Unreleased

- Merchant lifecycle emails: welcome (install), 24h/72h onboarding reminders,
  and completion email. Extends `Shop` (`contactEmail`, `firstInstalledAt`,
  `latestInstalledAt`) and `OnboardingStatus.startedAt`; adds `LifecycleEmail`
  jobs with DB-backed worker (`npm run worker:lifecycle`) and authenticated
  `POST /internal/process-lifecycle-emails`. Reuses Resend via `EmailProvider`
  with idempotency keys. Uninstall cancels pending jobs; reinstall preserves
  completed onboarding and does not restart the sequence.
- Onboarding: transparent `reviewtrix-wordmark.png` on every screen (no white/black
  plate behind the logo).
- Store health: merchants pick which installed theme to configure (Live badge on
  MAIN); selection stored in `rx_onboarding_theme` and used for Theme Editor
  deep-links + embed detection (`read_themes` only — no publish/switch).
- Onboarding: green ReviewTrix wordmark on every screen via `OnboardingShell`;
  welcome sample review replaced with a storefront-style preview card.
- Dashboard welcome greeting: “Welcome to ReviewTrix” for merchants who
  completed onboarding in the last 7 days; “Welcome back” otherwise.
- In-app Support page at `/app/support` (footer, Help, and Settings links);
  replaces bare `mailto:` clicks that fail in the Admin iframe.
- Storefront media URLs fall back to the absolute `ReviewMedia.url` when
  `MEDIA_PUBLIC_BASE_URL` is missing (avoids broken `/api/media/...` thumbs).
  Widget default accent / primary button aligned to theme extension teal
  `#0f766e`.
- Merchant onboarding v2 (launch checklist): replaced the linear wizard with
  Welcome → Store Health Check → Launch Checklist → Theme / Import /
  Automation / Branding → Celebration → Dashboard. Spec in
  `docs/onboarding/`; removed obsolete `docs/18_ONBOARDING_ReviewTrix.md`.
  `OnboardingStatus` now tracks `automationConfigured` and
  `brandingConfigured` (dropped wizard `currentStep` / `widgetAdded` /
  `emailConfigured`).
- Removed Render hosting leftovers (`render.yaml`, Render App URL docs/env
  notes). Production host is Coolify only
  (`https://reviewtrix.algorithmtrix.com`); Partner App URL must match via
  `shopify app deploy`.
- App Store audit fixes: removed unshipped Pro “remove app branding” claims from
  onboarding and billing docs; photos/replies called out as shipped Free+Pro.
- App Store submission readiness: counsel-ready `/privacy` and `/terms` (no
  placeholder copy; canonical `https://reviewtrix.algorithmtrix.com/…`);
  Support / Privacy / Terms in Help, footer, and Settings; Coolify deploy docs
  with `BILLING_TEST_MODE=false` for production; structured
  `privacy_customers_data_request` logs + ops runbook; Partner + pre-submit QA
  checklists in `11_APP_STORE_AND_BFS.md`.
- (Superseded by onboarding v2 above.) Initial onboarding introduced
  `OnboardingStatus`, app gate, theme detection (`read_themes`), and
  `/api/onboarding/status`.
- Product renamed from ReviewX to **ReviewTrix** (merchant UI, Shopify app
  name, privacy/terms, and docs). Marketing domain:
  `https://reviewtrix.algorithmtrix.com`.
- Review media S3 keys use `review-images/{shopId}/…` and
  `review-videos/{shopId}/…` (legacy `shops/…/reviews/…` keys still resolve).
- Removed the in-app marketing landing page (`app/features/marketing`); `/`
  redirects to `/auth/login` (or `/app` when `shop` is present). Public
  marketing lives on the separate Next.js site. Thin `/privacy` and `/terms`
  remain on the app origin.
- Billing page shows Pro **plan bought on** date, a non-clickable
  **Valid for 1 month** chip, and the exact **Expires** date from Shopify
  `AppSubscription` (`createdAt` / `currentPeriodEnd`).
- Storefront review cards show a green **Verified** badge (with checkmark) on
  every published review; Featured remains a separate merchant pin.
- Review Summary popover opens on hover (closes on leave) with a short smooth
  animation; star/bar default matches widget green `#22c55e`; count shows
  `(N reviews)`.
- Review Summary storefront UI matches Amazon-style product title ratings:
  chevron trigger, compact `(count)` link, white histogram card with % bars and
  “See customer reviews ›”.
- Storefront **Review Summary** block in the existing `review-widget` Theme App
  Extension (Shopify allows one theme extension per app): Amazon-style average
  + stars + count under the product title; accessible rating popover with
  distribution bars; count / “See all reviews” smooth-scroll to
  `#reviewx-reviews`. Single app-proxy fetch
  `GET /apps/reviews/products/{productId}/summary`. Backed by
  `ProductRatingSummary` (maintained on approve/reject/delete/import).
- Home “Reviews collected” chart is interactive: hover snaps to a day with a
  crosshair, accent dot, and tooltip (`reviews: N`); light draw animation on
  range change. Analytics snapshot email open/conversion remain estimated
  placeholders until campaign analytics ship.
- Save incentives, Save widget settings, and Save settings show a success modal
  with a green check (instead of only a banner or App Bridge toast); errors stay
  as critical banners.
- Top-right store avatar opens a Notion/Stripe-style right-side profile drawer
  (store name, Shopify domain, plan badge, Billing / Settings / API shortcuts)
  with backdrop and slide-in animation; bell and help stay as dropdowns.
- Dashboard Quick actions (and other Home CTAs) use React Router `Link` with
  intent prefetch instead of full-page `<a href>` navigations that broke the
  embedded session and showed a blank admin page; cards get a clearer
  hover lift like Notion/Stripe.
- Merchant admin navigations feel closer to Notion/Stripe: sidebar links
  prefetch on hover, the active nav item updates immediately, and the content
  area swaps to a light skeleton until the next route is ready (no full-screen
  overlay).
- Merchant admin: removed the full-screen “Loading… / Please wait…” nav overlay
  and App Bridge loading bar on sidebar navigations.
- Merchant admin navigation feels snappier: Home loader uses a 90-day chart
  window (1-year loads on demand), skips activity/email MoM on first paint,
  skips full revalidation after dashboard Approve/Hide/Delete (optimistic list
  updates).
- Home Live preview stretches to match Widget settings height (no inner
  scrollbar / empty band under the preview card).
- Home dashboard: Widget settings and Live preview sit side-by-side; preview
  updates instantly as controls change (layout, colors, toggles), then Save
  publishes.
- Storefront Q&A: after submit, success shows inside the ask modal (close via ×
  or Esc) instead of a low-visibility inline list message.
- Dashboard Approve / Hide / Delete: “Working…” only covers the POST (not full
  dashboard revalidation); success toasts fire as soon as the action returns so
  they are not lost when the row unmounts.
- Media public URLs are built from `ReviewMedia.storageKey` +
  `MEDIA_PUBLIC_BASE_URL` at read time (key-first); CDN/bucket host changes no
  longer require rewriting Neon rows.
- Media storage: `deleteObject` on local + S3-compatible adapters; roll back
  uploaded objects when `ReviewMedia` DB create fails after PutObject.
  `.env.example` / docs oriented to AWS S3 (`MEDIA_*` still works with R2).
- Corrected `docs/16_Reviewx-s3-architecture.md` to match the live React Router
  media path and AWS S3 via `MEDIA_*` / `MediaStorage` (no Multer or parallel
  submit API).
- Dashboard Approve / Hide / Delete actions show App Bridge success toasts
  (same copy as the Reviews queue).
- Logged-in storefront review/Q&A forms prefill email and display name from
  Shopify customer identity; if name is missing, display name falls back to a
  cleaned email local-part (still editable).
- Settings (`/app/settings`) uses the same ReviewTrix widget controls as Home, with
  a side-by-side live preview (stacked on mobile); Theme setup + uninstall
  survey kept below.
- In-app ReviewTrix uninstall survey on Settings (multi-select reasons + optional
  details); persists `UninstallFeedback`, then opens Shopify Admin apps so the
  merchant can finish uninstall. Shopify’s own uninstall survey is unchanged.
- Mobile merchant shell: hamburger opens an off-canvas sidebar drawer (no more
  wrapping nav chip wall under 800px); sidebar Settings destinations deduped.
- Dashboard Open queue / Full settings use SPA `Link`s; Reviews list no longer
  blocks on Admin GraphQL product-title enrichment (media still loads).
- Merchant admin navigations: overlay subtitle is “Please wait…”, no 900ms
  minimum hold; home volume chart uses SQL day aggregation; Reviews /
  Questions / Imports / Review requests skip live billing sync on load.
- Storefront review sort/filter toolbar (Most recent, Highest/Lowest rating,
  Only pictures, Pictures first, Videos first) under Add review; app-proxy
  `sort` + sort-aware cursors; `Review.hasImage` / `hasVideo` denormalized flags.
- Marketing theme uses `@theme inline` + `data-theme` so light/dark toggles
  the full page palette; nav/CTAs use a sage/emerald look instead of black.
- Rebuilt the ReviewTrix marketing site end-to-end: Tailwind + Framer Motion
  (LazyMotion), light/dark theme, sticky glass navbar, hero with floating
  cards, logo marquee, feature grid (Coming soon badges for AI/SEO/video),
  interactive dashboard preview, social proof counters, how-it-works, Free/Pro
  pricing, FAQ, install CTA, and multi-column footer. Marketing CSS stays
  scoped to public routes so Polaris admin is unaffected.
- Partner app display name set to ReviewTrix.
- Reviews search: top-bar `q` filters the moderation queue by customer name,
  review text, and product title; empty results show a clear “not found” state
  with a Clear search action.
- Rebuilt the merchant home dashboard to match `15_DASHBOARD_UI_SPEC.md`
  end-to-end: sticky sidebar/top bar, Shopify-green theme, 8px spacing,
  1400px content, sections in spec order (welcome → KPI → chart → rating →
  latest → pending → quick actions → widget preview → analytics), expandable
  reviews table with inline approve/hide/delete, empty/loading states, and
  responsive breakpoints.
- Dashboard polish: smooth Catmull-Rom volume chart with axis labels, chart +
  rating distribution side-by-side, and a Free-plan “Upgrade to Pro” sidebar
  card linking to Billing.
- Latest reviews + pending moderation restyled (avatar list, status dots,
  Approve/Hide/Delete); Pro “View plans” button sizing fixed; concise dashboard
  footer with Plans / API / Settings links.
- Dashboard moderation actions use compact icon controls with confirmation
  modals; latest/pending cards scroll internally so sibling layout stays stable.
- Phase 5.5 public API foundation: versioned REST `/api/v1` (list/submit
  reviews, summary, rating, product reviews), per-shop Bearer `ApiToken`
  generate/rotate/revoke (hash-at-rest), in-memory rate-limit architecture with
  Redis-ready interface, and merchant `/app/api` docs + token UI (Free + Pro).
- Faster local admin/storefront loads: `shopify.web.toml` no longer blocks the
  React Router server on `prisma migrate deploy` each restart (use
  `npm run db:migrate` when schema changes); home loader drops non-critical
  activity queries; Integrations/Incentives skip billing sync; billing cache
  TTL 1h; storefront review GET uses short Cache-Control.
- Phase 5.4 integrations: pluggable provider registry with encrypted
  `IntegrationConnection` credentials, Klaviyo event sync (published / request
  sent / completed), Gorgias ticket create + outbound merchant-reply sync,
  and `/app/integrations` admin connect/test/disconnect UI. SMS and inbound
  Gorgias webhooks remain deferred.
- Adopted `14_REVIEW_SUBMISSION_SPEC.md` as the source of truth for review
  submission identity, verified-buyer rules, and guest/logged-in flows; linked
  from Phase 5 roadmap, TODO (next vertical slice), and `AGENTS.md`.
- Thank-you referral step: Share product button opens a Flipkart-style share
  sheet (Copy Link, WhatsApp, Facebook, Messenger, Gmail, SMS, LinkedIn, More).
- Admin home loads faster: layout skips duplicate auth, dashboard skips
  blocking Admin GraphQL title enrichment, and activity queries use smaller
  recent limits.
- Phase 5.3 post-review incentives: `IncentiveCampaign` model, `/app/incentives`
  admin settings (coupon code paste + referral prompt), and thank-you step UI
  fed from review submit `201` (`incentive` payload). No coupon engine.
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
