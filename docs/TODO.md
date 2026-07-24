# Current Work

Source of truth: `04_ROADMAP.md`

Active phase: **Phase 5** (5.1 insights + 5.2 Q&A shipped); Phase 3 Render
pilot still relevant for production URLs.

## Completed

Phase 1 — Core Reviews and Widget is complete.

Phase 2 — Launch Features is complete.

Phase 3 through Built for Shopify gap recording (deploy deferred).

Phase 4 review-request DoD + merchant workspace dashboard + media.

Phase 5.1 product insights:

- `/app/products/:id` health dashboard (no Products nav)
- Stats, rating mix, volume/rating trends, AI placeholders
- Shared moderation: Publish / Hide / Feature / Reply / Delete
- Schema: `featured`, `merchantReply`, `merchantReplyAt`
- Chart axis labels (months + rating/count ticks)
- Storefront widget: Featured badge + merchant reply

Phase 5.2 product Q&A:

- `Question` model + statuses
- `/app/questions` Approve / Hide / Answer / Delete + search/filters
- Shared moderation utilities (toolbar, badge, action helper)
- Theme Q&A block + `/apps/reviews/qa` proxy
- Merchant email notification on new questions
- Privacy redact/export for question PII

## Next

1. Optional: configure `MEDIA_*` R2 env vars for production media
2. Confirm Partner Dashboard App URL + redirect match the intended host
3. Validation gate before broader Phase 5 (coupons, integrations)
4. BFS gaps: Flow trigger + customer admin block (`11_APP_STORE_AND_BFS.md`)

Future work belongs in the roadmap or ideas backlog, not this file.
