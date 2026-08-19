# App Store and Built for Shopify gaps

Recorded against Shopify’s published requirements (fetched 2026-07-21;
submission readiness pass 2026-08-06; AI self-review 2026-08-18). Do **not**
claim Built for Shopify status until Shopify awards it.

Canonical sources:

- [Built for Shopify requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements)
- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Privacy compliance webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)

## Listing classification

- Primary category: **Product reviews**
- Complete Partner Dashboard structured category details before submission
- Listing copy must not claim Built for Shopify, unearned badges, or competitor
  trademarks

## App Store listing — App details

Partners → App store listing content → **App details** (max 500 characters).
Use plain prose only: no bullets, numbered lists, labels, links, or marketing
slogans. Put specific capabilities in the separate **Features** field. Do not
use the words “free” or “pricing” in App details (Shopify review tip — plan
names and billing belong only in Pricing details).

Paste-ready App details:

```text
ReviewTrix helps Shopify merchants collect, moderate, and display product reviews on their storefront. Merchants add Theme App Extension blocks for star ratings and review lists, approve or reject submissions in the embedded admin, and send post-fulfillment review-request emails. CSV import brings existing reviews into the moderation queue. Published-review and review-request email allowances are enforced in the app.
```

Example Features items (separate field, not App details):

- Theme App Extension star rating and product review widgets
- Pending / approved / rejected moderation in the Shopify admin
- Post-fulfillment review-request emails
- CSV review import

Screenshot listing checks: do not include customer testimonials or ratings
imagery that Shopify flags (e.g. star-rating callouts or “Customer reviews”
promo text in screenshots).

Do not opt out of protected customer data — ReviewTrix needs PCD for order
email on review requests (`docs/Shopify_pcd.md`).

## AI self-review (2026-08-18)

Ran Shopify’s App Store AI self-review against the live requirements list.
Code-checkable items: **0 likely failing**. Remaining “needs review” items are
Partner Dashboard, live TLS, and billing decline/reinstall QA — not repo
blockers.

This pass also closed reviewer nits in code:

- App Bridge: `app-bridge.js` and `shopify-api-key` meta in `app/root.tsx` `<head>`
- `/auth/login` errors never ask the merchant to enter a shop domain
- Admin UI does not show fabricated AI insight headlines or estimated
  open/conversion percents

See Partner checklist and pre-submit QA below before submitting.

## App Store / security checklist (MVP status)

| Item | Status | Notes |
| --- | --- | --- |
| Shopify OAuth / session tokens | Done | Embedded React Router app |
| Webhook HMAC verification | Done | `authenticate.webhook`; invalid/missing HMAC returns explicit 401 |
| App proxy verification | Done | Storefront reviews |
| Mandatory compliance webhooks | Done | `customers/data_request`, `customers/redact`, `shop/redact` |
| Least-privilege scopes | Done | `read_orders,read_products,read_themes` |
| Protected customer data access | Gap (Partners) | Fill Partner form per `docs/Shopify_pcd.md` (Email field; Level 1+2 answers); prod approval with App Store review |
| Public distribution | Gap (Partners) | Enable App Store / public distribution for Billing API |
| Privacy policy URL | Done (code) | `https://reviewtrixapp.algorithmtrix.com/privacy` — wire URL in listing |
| Terms of service URL | Done (code) | `https://reviewtrixapp.algorithmtrix.com/terms` |
| In-app support / legal links | Done | Help menu, footer, Settings |
| App listing screenshots / demo store | Gap (Partners) | Submission assets |
| Billing disclosures | Done (app) / confirm listing | Free + Pro $19 / 14-day trial; set Coolify `BILLING_TEST_MODE=false` |
| Data-request ops runbook | Done | `10_OPERATIONS.md` + `privacy_customers_data_request` logs |

## Partner Dashboard checklist (before submit)

Complete in Shopify Partners (cannot be done from this repo):

- [ ] Enable **public / App Store distribution**
- [ ] Request **Protected customer data** access required for fulfillment email
      (follow `docs/Shopify_pcd.md` reasons, Email field, data-protection answers)
- [ ] App URL + redirect: `https://reviewtrixapp.algorithmtrix.com` and
      `…/auth/callback`
- [ ] Privacy policy URL: `https://reviewtrixapp.algorithmtrix.com/privacy`
- [ ] Support email: `support.reviewtrix@algorithmtrix.com`
- [ ] Category: **Product reviews** + structured category fields
- [ ] Pricing text matches Free + Pro ($19/mo, 14-day trial) and allowances
- [ ] Screenshots + demo store attached
- [ ] Listing copy: no Built for Shopify claim; no competitor trademarks
- [ ] `shopify app deploy` after URL/scope freeze
- [ ] Coolify env: `BILLING_TEST_MODE=false`, `NODE_ENV=production`

## Pre-submit QA checklist

- [ ] `GET https://reviewtrixapp.algorithmtrix.com/health?ready=1` → ready
- [ ] Install from Partner / Admin Apps / App Store (Shopify-owned surface).
      Bare app URL `/auth/login` is an App Store CTA only — no shop-domain form.
- [ ] Onboarding / Home loads on Coolify URL
- [ ] Clean OS 2.0 theme: enable app embed + Star rating / Product reviews /
      Review Summary; submit via app proxy; moderate in admin
- [ ] Billing: upgrade → approve; decline path; reinstall can request charge
      again (`BILLING_TEST_MODE=false`)
- [ ] Uninstall + reinstall OAuth works
- [ ] Admin usable at ~375px; storefront stars keyboard-reachable
- [ ] Public `/privacy` and `/terms` load without auth; no “placeholder” copy

See also `12_DEPLOYMENT.md` and `13_MERCHANT_SETUP.md`.

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
| Helpful onboarding | Done — `/app/onboarding` + dashboard reminders |
| Contextual save bar on forms | Gap — defer (BFS apply) |
| Homepage theme extension status via `app.extensions()` | Gap — defer (BFS apply) |
| Accessibility (WCAG-oriented contrast, labels) | Partial — run full a11y pass before submit |

### Category-specific — Product reviews (5.11)

| Requirement | Status |
| --- | --- |
| 5.11.1 Flow trigger when a review is collected | **Gap** — not required for App Store submit; BFS blocker |
| 5.11.2 Admin block on customer detail for that customer’s reviews | **Gap** — not required for App Store submit; BFS blocker |

Track in `08_IDEAS.md` as post-listing work.

### Billing (BFS / App Store)

- Shopify App Pricing Free + Pro implemented
- Plan transitions and entitlement sync implemented
- Confirm listing shows pricing, trial, and allowance language clearly
- Partner Dashboard: enable public distribution before relying on Billing API
  in production

## Theme App Extension verification notes

- Extension: `extensions/review-widget`
- Blocks: review list, star rating, Review Summary, app embed
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

## What Phase 3 / submission readiness closed in code/docs

- Compliance webhooks + retention/deletion procedures
- Rate limits on public review-request API
- `/health` readiness probe + CI workflow
- Onboarding / uninstall dashboard messaging
- Counsel-ready `/privacy` and `/terms` on app origin (canonical Coolify URLs)
- In-app Support / Privacy / Terms links (Help, footer, Settings)
- Coolify deployment + `BILLING_TEST_MODE=false` guidance
- Data-request operator runbook (`privacy_customers_data_request` logs)
- This gap record updated for App Store submit vs BFS deferrals
- AI self-review 2026-08-18: 0 likely failing; App Bridge head script,
  shop-domain-free login errors, no fabricated admin insight/analytics copy
