# Current Work

Source of truth: `04_ROADMAP.md`

Active phase: **Phase 2 — Launch Features**

## Completed

Phase 1 — Core Reviews and Widget is complete:

- Shop install/reinstall/uninstall lifecycle
- Review and WidgetSettings models
- Merchant review CRUD with filters and cursor pagination
- Storefront app-proxy review read/submit API
- Theme App Extension (app embed, star rating, product reviews)
- Widget settings and theme setup guidance

Phase 2 Slice 1 — Moderation is complete:

- Pending, approved, and rejected moderation queues with counts
- Queue-aware single approve/reject actions
- Safe bulk approve/reject with Free-plan published-review limit feedback
- Published-review usage banner for Free merchants

Phase 2 Slice 2 — Billing is complete:

- Shopify-hosted Pro upgrade flow with test-mode support
- Billing sync from Shopify subscription state to `Shop.plan`
- Billing page with plan comparison and published-review usage
- Free (100) and Pro (5,000) published-review allowances

Phase 2 Slice 3 — CSV import is complete:

- Bounded CSV upload with header and row validation
- Synchronous batch import into `Review` records with `source = IMPORT`
- Import job history, progress counts, and downloadable error reports
- Duplicate import protection per shop and CSV content hash

## Next Complete Slice

Phase 2 Slice 4 — Email request foundation:

- Fulfillment webhook handling
- Review-request scheduling model
- Email provider integration and delivery status

## Deployment Prerequisite

- Configure permanent production application and redirect URLs before the Phase
  3 pilot.

Future work belongs in the roadmap or ideas backlog, not this file.
