# Deployment

Production host: **Coolify** at `https://reviewtrix.algorithmtrix.com` + **Neon
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
              https://reviewtrix.algorithmtrix.com
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
| `SHOPIFY_APP_URL` | `https://reviewtrix.algorithmtrix.com` |
| `SCOPES` | `read_orders,read_products,read_themes` |
| `NODE_ENV` | `production` |
| `BILLING_TEST_MODE` | **`false` for App Store / public listing** (use `true` only on staging) |
| `MEDIA_S3_*` / `MEDIA_PUBLIC_BASE_URL` | Production media bucket |
| `INTEGRATIONS_ENCRYPTION_KEY` | 32-byte AES key (hex/base64) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional; without these, review emails log to console |

`isBillingTestMode()` (`app/lib/billing-env.server.ts`): explicit
`BILLING_TEST_MODE` wins; if unset, defaults to test charges when
`NODE_ENV !== "production"`. Always set `BILLING_TEST_MODE=false` on Coolify
before App Store review so Pro upgrades create real (or Partner-approved)
charges, not test charges.

Do not hardcode local `shopify app dev` ports (`4742`, etc.).

## 2. Point Shopify at Coolify

[`shopify.app.toml`](../shopify.app.toml) should contain:

```toml
application_url = "https://reviewtrix.algorithmtrix.com"
redirect_urls = [ "https://reviewtrix.algorithmtrix.com/api/auth" ]
automatically_update_urls_on_dev = false
```

`automatically_update_urls_on_dev = false` prevents `shopify app dev` from
rewriting Partner URLs back to a tunnel (which breaks Coolify install).

Then:

1. Partner Dashboard → same **App URL** and **Allowed redirection URL(s)**.
2. Listing privacy URL → `https://reviewtrix.algorithmtrix.com/privacy`
3. Deploy Shopify config + extension + webhooks:

```powershell
shopify app deploy
```

4. Confirm Coolify env `SHOPIFY_APP_URL` matches.

## 3. Smoke test after deploy

```powershell
curl https://reviewtrix.algorithmtrix.com/health?ready=1
```

- [ ] Health returns ready
- [ ] Open `https://reviewtrix.algorithmtrix.com/` → redirects to `/auth/login`
      (marketing site is separate Next.js app)
- [ ] Install from Partner / Admin Apps (prefer Shopify-owned install surface)
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
`https://reviewtrix.algorithmtrix.com` (and `/api/auth`) then run
`shopify app deploy`.
