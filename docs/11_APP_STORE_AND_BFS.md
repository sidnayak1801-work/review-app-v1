# App Store and Built for Shopify gaps

Recorded against Shopify’s published requirements (fetched 2026-07-21).
Do **not** claim Built for Shopify status until Shopify awards it.

Canonical sources:

- [Built for Shopify requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements)
- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Privacy compliance webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)

## Listing classification

- Primary category: **Product reviews**
- Complete Partner Dashboard structured category details before submission
- Listing copy must not claim Built for Shopify, unearned badges, or competitor
  trademarks

## App Store / security checklist (MVP status)

| Item | Status | Notes |
| --- | --- | --- |
| Shopify OAuth / session tokens | Done | Embedded React Router app |
| Webhook HMAC verification | Done | `authenticate.webhook` |
| App proxy verification | Done | Storefront reviews |
| Mandatory compliance webhooks | Done | `customers/data_request`, `customers/redact`, `shop/redact` |
| Least-privilege scopes | Done | `read_orders` for fulfillment emails |
| Protected customer data access | Gap | Partner Dashboard approval required for order email on non-dev stores |
| Public distribution | Gap | Billing API requires public/App Store distribution |
| Privacy policy URL | Gap | Required for App Store listing |
| App listing screenshots / demo store | Gap | Submission assets |
| Billing disclosures | Partial | In-app Free/Pro + allowances; confirm listing pricing text matches |

## Built for Shopify — remaining eligibility gaps

### Prerequisites (cannot close in code alone)

- App Store listing live and compliant
- Good Partner standing
- ≥50 net installs on paid Shopify plans
- ≥5 App Store reviews and minimum rating threshold

### Performance (needs production traffic)

- Admin Web Vitals at p75: LCP ≤2.5s, CLS ≤0.1, INP ≤200ms (≥100 samples / 28d)
- Storefront: Lighthouse score drop ≤10 from Theme App Extension
- Checkout carrier metrics N/A (no carrier service)

### Integration

| Requirement | Status |
| --- | --- |
| Embedded with latest App Bridge | Done (Polaris / App Bridge React Router) |
| Primary workflows in admin | Done |
| Seamless Shopify sign-up | Done |
| Homepage metrics / monitoring | Partial — counts and setup checklist; richer analytics later |
| Theme App Extensions (no Asset API theme edits) | Done |
| Clean uninstall (blocks remove with extension) | Done |

### Design / UX

| Requirement | Status |
| --- | --- |
| NavMenu primary navigation | Done |
| Mobile-friendly Polaris layouts | Verify on device before submit |
| Helpful onboarding | Partial — home checklist added; refine dismissible steps if review asks |
| Contextual save bar on forms | Gap — widget settings / forms may need CSB before BFS apply |
| Homepage theme extension status via `app.extensions()` | Gap — surface block/embed activation on home |
| Accessibility (WCAG-oriented contrast, labels) | Partial — widget stars have labels; run full a11y pass before submit |

### Category-specific — Product reviews (5.11)

| Requirement | Status |
| --- | --- |
| 5.11.1 Flow trigger when a review is collected | **Gap** — not implemented |
| 5.11.2 Admin block on customer detail for that customer’s reviews | **Gap** — not implemented |

These two are hard blockers for Built for Shopify under Product reviews even
after general quality bars are met. Track as post-pilot work (not Phase 4
review-request UX).

### Billing (BFS / App Store)

- Shopify App Pricing Free + Pro implemented
- Plan transitions and entitlement sync implemented
- Confirm listing shows pricing, trial (if any), and allowance language clearly
- Partner Dashboard: enable public distribution before relying on Billing API
  in production

## Theme App Extension verification notes

- Extension: `extensions/review-widget`
- Blocks: review list, star rating, app embed
- Merchants enable via theme editor — no Liquid theme-code edits required
- Uninstall removes extension blocks automatically
- Before submit: install on a clean OS 2.0 theme, enable embed + blocks, confirm
  ratings render and form submits through app proxy

## Accessibility and responsive verification notes

Manual pass before App Store submit:

- [ ] Admin pages usable at ~375px width without horizontal scroll
- [ ] Focus order and labels on review moderation and settings forms
- [ ] Storefront widget keyboard reachable; star rating has accessible name
- [ ] Error banners announced / visible next to actions
- [ ] Color contrast of accent color against theme backgrounds

## What Phase 3 closed in code/docs

- Compliance webhooks + retention/deletion procedures
- Rate limits on public review-request API
- `/health` readiness probe + CI workflow
- Onboarding / uninstall dashboard messaging
- Landing page no longer implies Built for Shopify award
- This gap record for BFS eligibility
