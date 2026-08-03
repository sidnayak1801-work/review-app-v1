# Merchant setup (pilot)

Short guide for a store installing this review app during the Phase 3 pilot.
Operators should finish [12_DEPLOYMENT.md](12_DEPLOYMENT.md) first so the app
URL is a stable host (Render: `https://review-app-v1.onrender.com`), not a
`shopify app dev` tunnel.

## 1. Install

1. Install from the **Shopify App Store** listing (or Partner Dashboard install
   link for development stores). Public marketing / install CTA lives on the
   separate Next.js marketing site, which sends merchants to the App Store —
   not the app root URL.
2. Approve requested scopes (`read_orders` for review-request emails).
3. Confirm the app Home shows shop status **INSTALLED** and a setup checklist.

## 2. Widget and theme

1. Open **Widget settings** — set accent color, reviews per page, and whether
   the storefront submission form is enabled.
2. In the Shopify theme editor (Online Store → Themes → Customize):
   - Enable the app embed if offered
   - Add **star rating** and **review list** blocks on the product template
3. Save the theme. No theme Liquid code edits are required.

## 3. Reviews workflow

1. Open **Reviews** — queues: Pending, Approved, Rejected.
2. Approve reviews you want public; reject spam.
3. Free plan: published (approved) reviews are capped (100). Upgrade on
   **Billing** if you hit the limit.
4. Optional: **Imports** — download the sample CSV, upload existing reviews,
   fix any row errors from the error report.

## 4. Review-request emails

1. After orders are **fulfilled**, the app schedules review-request emails
   (fixed delay today; configurable delays come in Phase 4).
2. Check **Review requests** for Scheduled / Sent / Failed status and monthly
   usage (Free 50 / Pro 1,000 per UTC month).
3. Customers open the email link and submit a review (marked verified purchase).
4. Those submissions still appear under **Pending** until you approve them.

**Note:** The product-page form (if enabled) lets visitors submit without a
purchase. Turn the form off in Widget settings if you only want email-based
reviews.

## 5. Billing

1. Open **Billing** to see Free vs Pro and allowances.
2. Upgrade uses Shopify’s billing flow. Public App Store distribution must be
   enabled for the Billing API outside some partner setups.

## 6. Uninstall

Uninstalling marks the shop uninstalled and removes sessions. Review data is
kept until Shopify sends a shop redaction webhook (~48 hours after uninstall).
Theme app blocks are removed automatically with the Theme App Extension.

## Support (pilot)

Contact the operator with:

- Shop domain (e.g. `your-store.myshopify.com`)
- Approximate time of the issue
- What you were trying to do (install, widget, moderation, import, email, billing)

Do not send customer passwords or full CSV files containing personal data over
insecure channels.
