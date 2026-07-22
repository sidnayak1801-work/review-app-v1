# Deployment (Fly.io)

Production host for Phase 3: **Fly.io** + **Neon PostgreSQL**.
Shopify config/extensions still deploy with `shopify app deploy`.

This runbook completes Phase 3 operator documentation. Apply the companion
code/config changes (`fly.toml`, multi-stage `Dockerfile`) in Agent mode if
they are not yet in the repo, then run the commands below.

## Prerequisites

- [ ] Neon production database (pooled + direct connection strings)
- [ ] Fly.io account (`fly auth login`)
- [ ] **Fly organization billing** — add a card or credit at
  https://fly.io/dashboard (apps cannot be created without it)
- [ ] Fly CLI installed (`flyctl` — Windows: `%USERPROFILE%\.fly\bin`)
- [ ] Shopify Partner app Client ID / secret (`shopify app env show`)
- [ ] Optional: Resend API key for real review-request email

## Repo config (already in tree)

- Multi-stage [`Dockerfile`](../Dockerfile) (build with Vite, then prune)
- [`fly.toml`](../fly.toml) — app `review-app-v1`, region `iad`, health
  `/health?ready=1`, single always-on machine
- [`.dockerignore`](../.dockerignore)
- Helper: `node scripts/set-fly-secrets.mjs https://review-app-v1.fly.dev`
  (loads Neon from `.env` and Shopify keys from `shopify app env show`; does
  not print secret values)

## Architecture

```text
Neon Postgres  <-->  Fly machine (Node / React Router)
                           |
                    https://<app>.fly.dev
                           |
              Partner Dashboard URLs + webhooks
                           |
                 Theme App Extension (shopify app deploy)
```

Single Fly machine for the pilot (`min_machines_running = 1`, auto-stop off)
so in-memory rate limits and email processing stay on one process.

## 1. Fix / add host config (once)

Repo already includes the multi-stage `Dockerfile`, `fly.toml`, and
`.dockerignore`. Re-run Agent deploy only after Fly billing is active.

## 2. Launch and deploy

**Blocked until Fly billing is enabled** for org `Algorithmtrix` / personal.
Then:

```powershell
# Add Fly CLI to PATH for this session if needed
$env:Path = "$env:USERPROFILE\.fly\bin;$env:Path"

fly auth login
fly apps create review-app-v1
node scripts/set-fly-secrets.mjs https://review-app-v1.fly.dev
fly deploy
fly status
curl https://review-app-v1.fly.dev/health?ready=1
```

On boot, `npm run docker-start` runs `prisma migrate deploy` then serves the app.

## 3. Point Shopify at Fly

1. Set `SHOPIFY_APP_URL` to `https://<your-app>.fly.dev` (secret/env).
2. Update `shopify.app.toml`:

```toml
application_url = "https://<your-app>.fly.dev"
redirect_urls = [ "https://<your-app>.fly.dev/api/auth" ]
```

3. Partner Dashboard → same Application URL and Allowed redirection URL(s).
4. Deploy Shopify config + extension + webhooks:

```powershell
shopify app deploy
```

That registers `app/uninstalled`, `app/scopes_update`, `orders/fulfilled`, and
compliance topics (`customers/data_request`, `customers/redact`, `shop/redact`).

5. For non-dev stores: request **protected customer data** access for order
   email. For **Billing API** in production: enable **public distribution**.

## 4. Pilot checklist

See [13_MERCHANT_SETUP.md](13_MERCHANT_SETUP.md) for merchant steps. Operator
smoke test:

- [ ] `/health?ready=1` returns `ok: true`
- [ ] Install app on a development store
- [ ] Home shows INSTALLED + setup checklist
- [ ] Widget settings save; theme editor enables blocks
- [ ] Storefront shows approved reviews; form submits → Pending
- [ ] Approve review → appears on storefront
- [ ] (Optional) Fulfill test order → review request schedules/sends
- [ ] Billing page loads; upgrade only if public distribution is enabled
- [ ] `fly logs` shows structured JSON without secrets/PII

## 5. Uptime

Point an external monitor at:

`https://<your-app>.fly.dev/health?ready=1`

Alert on non-2xx for 2–3 consecutive checks.

## 6. Moving to Render later

Same Neon DB and Shopify app. Deploy the container on Render, update
`SHOPIFY_APP_URL` + Partner URLs + `shopify app deploy`, then stop Fly.
Details also in the earlier ops notes in `10_OPERATIONS.md`.

## Rollback

```powershell
fly releases
fly deploy --image-label <previous>   # or redeploy a known-good git SHA
```

Database: restore from Neon PITR/backup per `10_OPERATIONS.md`.
