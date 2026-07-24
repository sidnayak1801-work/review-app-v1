# Deployment (Render)

Current hosted URL for testing/pilot: **Render** + **Neon PostgreSQL**.
Shopify config/extensions still deploy with `shopify app deploy`.

Fly.io remains an option later (always-on) when org billing is available;
see historical notes at the end of this file.

## Prerequisites

- [ ] Neon database (pooled + direct connection strings)
- [ ] Render Web Service `review-app-v1` (free plan OK for light testing)
- [ ] Shopify Partner app Client ID / secret
- [ ] Optional: Resend API key for real review-request email

## Architecture

```text
Neon Postgres  <-->  Render Web Service (Node / React Router)
                           |
              https://review-app-v1.onrender.com
                           |
              Partner Dashboard URLs + webhooks
                           |
                 Theme App Extension (shopify app deploy)
```

Free Render instances **sleep after ~15 minutes** idle and take ~1 minute to
wake. That is fine for manual UI tests; webhooks may fail while asleep.

## 1. Render service settings

Repo includes [`render.yaml`](../render.yaml) as a Blueprint reference.

| Field | Value |
|-------|--------|
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start` |
| Health check | `/health?ready=1` |
| Node | 20 or 22 |

### Environment variables (Render Dashboard)

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon pooled URL (`?sslmode=require`) |
| `DIRECT_URL` | Neon direct URL (`?sslmode=require`) |
| `SHOPIFY_API_KEY` | App Client ID |
| `SHOPIFY_API_SECRET` | App Client secret |
| `SHOPIFY_APP_URL` | `https://review-app-v1.onrender.com` |
| `SCOPES` | `read_orders` |
| `NODE_ENV` | `production` |
| `BILLING_TEST_MODE` | `true` for test charges |

Do not set `PORT` (Render injects it).

## 2. Point Shopify at Render

[`shopify.app.toml`](../shopify.app.toml) should already contain:

```toml
application_url = "https://review-app-v1.onrender.com"
redirect_urls = [ "https://review-app-v1.onrender.com/api/auth" ]
automatically_update_urls_on_dev = false
```

`automatically_update_urls_on_dev = false` prevents `shopify app dev` from
rewriting Partner URLs back to a tunnel (which breaks Render install).

Then:

1. Partner Dashboard → same **App URL** and **Allowed redirection URL(s)**.
2. Deploy Shopify config + extension + webhooks:

```powershell
shopify app deploy
```

3. Confirm Render env `SHOPIFY_APP_URL` matches.

## 3. Smoke test after deploy

```powershell
curl https://review-app-v1.onrender.com/health?ready=1
```

- [ ] Health returns ready (allow ~1 min cold start on free)
- [ ] Open `https://review-app-v1.onrender.com/` (landing)
- [ ] Install on an **allowed** development store (e.g. your Partner store),
      not an arbitrary shop that is not linked to the app
- [ ] App Home shows INSTALLED
- [ ] Settings → theme blocks → storefront review → approve in Reviews
- [ ] Billing page loads; Pro upgrade uses test charges when
      `BILLING_TEST_MODE=true`

## 4. Local development vs Render

- **Render / install from landing page:** keep toml URLs on Render;
  `automatically_update_urls_on_dev = false`.
- **Local tunnel only:** temporarily set
  `automatically_update_urls_on_dev = true`, run `shopify app dev`, then
  restore Render URLs and `shopify app deploy` before testing the hosted app
  again.

## 5. Merchant checklist

See [13_MERCHANT_SETUP.md](13_MERCHANT_SETUP.md).

## Fly.io (optional later)

Repo still has `Dockerfile` + `fly.toml` for an always-on host. Requires Fly
org billing. Same Neon DB; switch `SHOPIFY_APP_URL` + toml URLs +
`shopify app deploy`, then stop relying on Render.
