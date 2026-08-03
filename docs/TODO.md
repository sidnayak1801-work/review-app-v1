# Current Work

Source of truth: `04_ROADMAP.md`

Active phase: **Phase 5** (5.1–5.5 shipped); merchant home follows
`15_DASHBOARD_UI_SPEC.md`. Phase 3 Render pilot still relevant for production
URLs.

Review submission / identity / verified-buyer work must follow
`14_REVIEW_SUBMISSION_SPEC.md`.

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

Phase 5.3 post-review incentives:

- `IncentiveCampaign` (POST_REVIEW; ACTIVE/PAUSED)
- `/app/incentives` settings (coupon + referral + thank-you copy)
- Storefront thank-you shows coupon/referral after successful submit
- Coupon codes only on POST success (not GET settings)
- Thank-you referral share sheet (WhatsApp, Facebook, Copy link, Gmail, etc.)
- Admin home load path trimmed (no duplicate layout auth / GraphQL enrich)

Phase 5.4 integrations:

- Provider interface + registry (Klaviyo, Gorgias)
- Encrypted `IntegrationConnection` + `IntegrationExternalRef`
- Klaviyo: Review Published / Request Sent / Request Completed events
- Gorgias: ticket on publish + outbound merchant-reply sync
- `/app/integrations` Connect / Test / Disconnect / Reconnect
- Follow-up: inbound Gorgias webhooks; Klaviyo SMS sends

Phase 5.5 public API:

- `/api/v1` REST: reviews list/submit, summary, rating, product reviews
- `ApiToken` per shop (generate / rotate / revoke; hash-at-rest)
- Rate-limit architecture (in-memory; Redis-ready interface)
- Merchant `/app/api` docs + token management (Free + Pro)

ReviewX merchant dashboard (`15_DASHBOARD_UI_SPEC.md`):

- `/app` home rebuilt to the full section order + design tokens from the spec
- Inline approve/hide/delete and widget settings save preserved

Storefront sort/filter:

- Widget toolbar under Add review with green-accent sort menu
- App-proxy `sort` + `Review.hasImage` / `hasVideo` for media ordering

Admin load performance:

- Nav overlay: “Please wait…”; no artificial 900ms hold
- Home volume series SQL `GROUP BY` day; dropped redundant avg query
- Reviews / Questions / Imports / Review requests use cached shop (no live billing sync)

Uninstall survey + mobile nav:

- Settings → Uninstall ReviewX modal (multi-select reasons + details)
- Saves `UninstallFeedback`, then redirects to Shopify Admin apps
- ≤800px: hamburger + off-canvas sidebar drawer

## Next

Storefront Review Summary (`17_REVIEW_SUMMARY.md`) is implemented:

- Block in `extensions/review-widget` + `ProductRatingSummary` + summary route
- Apply migration `20260731120000_add_product_rating_summary` on each env
- Theme editor: add **Review Summary** under the product title; keep Product
  reviews block for `#reviewx-reviews` scroll target
- Rebuild assets with `npm run build:review-summary` after edits under
  `tooling/review-summary/`

1. Submission-identity vertical slice (per `14_REVIEW_SUBMISSION_SPEC.md`):
   storefront logged-in skip About You, server-side `source` /
   `verifiedPurchase`, Verified Buyer badge (non-editable), then guest allow
   setting enforcement
2. Optional: measure remaining admin routes (product insights) if still >2s
3. Optional: storefront “Most helpful” (needs helpful-votes data + UI)
4. Optional: confirm `MEDIA_*` AWS S3 (or S3-compatible) env vars are set for
   production hosts; `INTEGRATIONS_ENCRYPTION_KEY` for integrations
5. Confirm Partner Dashboard App URL + redirect match the intended host
6. Validation gate before broader Phase 5 (syndication)
7. BFS gaps: Flow trigger + customer admin block (`11_APP_STORE_AND_BFS.md`)
8. Integrations follow-up: Gorgias inbound reply webhooks; Klaviyo SMS
9. Public API follow-up: Redis rate limiter; GraphQL surface reusing auth modules

Future work belongs in the roadmap or ideas backlog, not this file.
