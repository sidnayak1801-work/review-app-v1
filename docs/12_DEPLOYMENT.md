# Deployment

Production host: **Coolify** at `https://reviewtrixapp.algorithmtrix.com` + **Neon
PostgreSQL**. Shopify config/extensions still deploy with `shopify app deploy`.

## Prerequisites

- [ ] Neon database (pooled + direct connection strings)
- [ ] Coolify web service for ReviewTrix (port **3000**)
- [ ] Shopify Partner app Client ID / secret
- [ ] Optional: Resend API key for real review-request email

## Architecture

```text
Neon Postgres  <-->  Coolify (Node / React Router)
                           |
              https://reviewtrixapp.algorithmtrix.com
                           |
              Partner Dashboard URLs + webhooks
                           |
                 Theme App Extension (shopify app deploy)
```

## 1. Coolify service settings

| Field | Value |
|-------|--------|
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start` |
| Health check | `/health?ready=1` |
| Port | `3000` (match Coolify exposed port / `PORT`) |
| Node | 20 or 22 |

### Environment variables (Coolify)

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon pooled URL (`?sslmode=require`) |
| `DIRECT_URL` | Neon direct URL (`?sslmode=require`) |
| `SHOPIFY_API_KEY` | App Client ID |
| `SHOPIFY_API_SECRET` | App Client secret |
| `SHOPIFY_APP_URL` | `https://reviewtrixapp.algorithmtrix.com` |
| `SCOPES` | `read_orders,read_products,read_themes` |
| `NODE_ENV` | `production` |
| `BILLING_TEST_MODE` | **`false` for App Store / public listing** (use `true` only on staging) |
| `MEDIA_S3_*` / `MEDIA_PUBLIC_BASE_URL` | Production media bucket. **`MEDIA_PUBLIC_BASE_URL` is required** for storefront photos (public S3/CloudFront base, no trailing slash, e.g. `https://reviewx.s3.ap-south-1.amazonaws.com`). Without it, the API may emit `/api/media/...` URLs that 404 on the shop and app. |
| `INTEGRATIONS_ENCRYPTION_KEY` | 32-byte AES key (hex/base64) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional; without these, review/lifecycle emails log to console |
| `INTERNAL_JOB_SECRET` | Bearer secret for `POST /internal/process-lifecycle-emails` |

### Lifecycle email worker (recommended)

Merchant welcome / onboarding reminder emails are database-backed. They need a
processor in addition to the web service:

**Option A — second Coolify service (same image)**

| Field | Value |
|-------|--------|
| Start Command | `npm run docker-worker` |
| Env | Same `DATABASE_URL`, `DIRECT_URL`, `RESEND_*`, `SHOPIFY_*` as web |

**Option B — Coolify cron / scheduled HTTP job**

```text
POST https://reviewtrixapp.algorithmtrix.com/internal/process-lifecycle-emails
Authorization: Bearer $INTERNAL_JOB_SECRET
```

Run every 1 minute. Without A or B, welcome/reminder/completion jobs stay
`SCHEDULED` and are never sent.

`isBillingTestMode()` (`app/lib/billing-env.server.ts`): explicit
`BILLING_TEST_MODE` wins; if unset, defaults to test charges when
`NODE_ENV !== "production"`. Always set `BILLING_TEST_MODE=false` on Coolify
before App Store review so Pro upgrades create real (or Partner-approved)
charges, not test charges.

Do not hardcode local `shopify app dev` ports (`4742`, etc.).

## 2. Point Shopify at Coolify

[`shopify.app.toml`](../shopify.app.toml) should contain:

```toml
application_url = "https://reviewtrixapp.algorithmtrix.com"
redirect_urls = [ "https://reviewtrixapp.algorithmtrix.com/auth/callback" ]
automatically_update_urls_on_dev = false
```

`automatically_update_urls_on_dev = false` prevents `shopify app dev` from
rewriting Partner URLs back to a tunnel (which breaks Coolify install).

Then:

1. Partner Dashboard → same **App URL** and **Allowed redirection URL(s)**.
2. Listing privacy URL → `https://reviewtrixapp.algorithmtrix.com/privacy`
3. Deploy Shopify config + extension + webhooks:

```powershell
shopify app deploy
```

4. Confirm Coolify env `SHOPIFY_APP_URL` matches.

## 3. Smoke test after deploy

```powershell
curl https://reviewtrixapp.algorithmtrix.com/health?ready=1
```

- [ ] Health returns ready
- [ ] Open `https://reviewtrixapp.algorithmtrix.com/` → redirects to `/auth/login`
      (App Store install CTA; marketing site is the separate Next.js app at
      `https://reviewtrix.algorithmtrix.com`)
- [ ] Install from Partner / Admin Apps / App Store (prefer Shopify-owned install surface)
- [ ] App Home / onboarding loads
- [ ] Settings → theme blocks → storefront review → approve in Reviews
- [ ] Billing: with `BILLING_TEST_MODE=false`, upgrade/decline/reinstall charge
      request still works

## 4. Local development vs Coolify

- **Coolify / production install:** keep toml URLs on Coolify;
  `automatically_update_urls_on_dev = false`. Merchants install via App Store
  (or Partner install link), not an in-app landing page.
- **Local tunnel only:** temporarily set
  `automatically_update_urls_on_dev = true`, run `shopify app dev`, then
  restore Coolify URLs and `shopify app deploy` before testing the hosted app
  again.

## 5. Merchant checklist

See [13_MERCHANT_SETUP.md](13_MERCHANT_SETUP.md).

## App Store submission checklists

See [11_APP_STORE_AND_BFS.md](11_APP_STORE_AND_BFS.md) — Partner Dashboard steps
and pre-submit QA.

If Admin still loads an old host after Coolify is live, Partner Dashboard App URL
and Allowed redirection URL(s) are stale — set them to
`https://reviewtrixapp.algorithmtrix.com` (and `/auth/callback`) then run
`shopify app deploy`.
