# ReviewTrix Protected Customer Data (PCD) Runbook

Partner Dashboard fill-in guide for Shopify Protected Customer Data access.
Official Shopify policy (do not re-copy into this repo):
[Work with protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data).

## Why ReviewTrix needs PCD

ReviewTrix is **Level 2** PCD:

- Scopes: `read_orders`, `read_products`, `read_themes` (`shopify.app.toml`)
- Webhook: `orders/fulfilled` schedules review-request emails
- Protected field used from Shopify: **buyer email**
- Also uses shipping/billing **country code** only for domestic vs international
  delay (not street address / zip — do not request Address)

Without PCD approval, production stores redact order customer email and
review-request scheduling fails. Development stores can use selected data after
data-protection details are saved; public production approval follows App Store
review.

Related docs:

- Privacy policy (merchant-facing): `/privacy` →
  `https://reviewtrix.algorithmtrix.com/privacy` (`app/routes/privacy.tsx`)
- Ops / retention / data requests: `10_OPERATIONS.md`
- App Store checklist: `11_APP_STORE_AND_BFS.md`

---

## API access requests (Partners checklist)

Partners → **API access requests**
(`…/apps/…/api_access`). Only request access the app actually needs
([access scopes](https://shopify.dev/docs/api/usage/access-scopes);
App Store requirement 3.2.1 for `read_all_orders`).

| Card | Action for ReviewTrix |
| --- | --- |
| **Protected customer data access** | **Required** — click **Manage**, complete this runbook (reasons, Email field, data-protection details), Save. Production approval rides with App Store listing review after details are saved. Draft is expected until then. |
| **Read all orders scope** | **Do not request.** Default `read_orders` covers the last 60 days. ReviewTrix schedules from live `orders/fulfilled` webhooks and does not query or backfill orders older than 60 days. Do not add `read_all_orders` to `shopify.app.toml`. |
| **Other protected scopes** (Subscriptions APIs, payment mandate, checkout extensions APIs, etc.) | **Do not request.** ReviewTrix is embedded admin + Online Store theme extension only. |

Manual steps: Manage PCD → Save answers from this doc → leave Read all orders
unrequested → continue App Store submission.

---

## Partner Dashboard — data use and reasons

**API access requests → Protected customer data access**

### Reasons to check

| Reason | Select? |
| --- | --- |
| App functionality | **Yes** |
| Marketing or advertising | **Yes** |
| Customer service | No |
| Store management | No |
| Analytics | No |
| Personalization | No |
| Other | No |

### Overall reason text (paste)

```text
App functionality and marketing: we process order and fulfillment data to
schedule verified post-purchase review-request emails and run the product-review
workflow described in our App Store listing. We do not sell personal data or use
it for unrelated advertising.
```

### Protected customer fields

| Field | Select? | Reason to paste |
| --- | --- | --- |
| Email | **Yes** | Required to send post-fulfillment review-request and optional reminder emails to the purchasing customer. |
| Name | **No** | Reviewer display name comes from storefront/import forms, not Shopify Customer first/last name. |
| Phone | **No** | Not used. |
| Address | **No** | We only use country code for request delay; we do not need street, zip, or geolocation. |

---

## Data protection details — answer key

Answer every question so Level 1 + Level 2 requirements are affirmed. A required
**No** (especially “limit use to that purpose”) triggers the pink banner:
*“confirm that you meet Shopify's requirements… in your data protection
details.”*

### Purpose

| Question | Answer |
| --- | --- |
| Do you process the minimum personal data required to provide value to merchants? | **Yes** |
| Do you tell merchants the personal data that you process and your purposes for processing it? | **Yes** |
| Do you limit your use of personal data to that purpose? | **Yes** |

### Consent

| Question | Answer |
| --- | --- |
| Do you have privacy and data protection agreements with your merchants? | **Yes** (`/privacy`, `/terms`) |
| Do you respect and apply customers' consent decisions? | **Yes** (merchant is controller; honor `customers/redact` / data requests; process only for merchant-enabled review features) |
| Do you respect and apply customers' decisions to opt-out of having their data sold? | **Not applicable** (we do not sell personal information) |
| If you use personal data for automated decision-making and those decisions may have legal or significant effects, can customers opt-out? | **Not applicable** (no such automated decisions) |

### Storage

| Question | Answer |
| --- | --- |
| Do you have retention periods that make sure personal data isn't kept longer than needed? | **Yes** |
| Do you encrypt data at rest and in transit? | **Yes** |
| Do you encrypt your data backups? | **Yes** (verify Neon PITR/backups on the production project) |
| Do you separate test and production data? | **Yes** |

### Access

| Question | Answer |
| --- | --- |
| Do you have a data loss prevention strategy? | **Yes** (see [DLP strategy](#dlp-strategy) below) |
| Do you limit staff access to customers' personal data? | **Yes** |
| Do you have strong password requirements for staff passwords? | **Yes** (MFA / password manager on Neon, Coolify, GitHub, email) |
| Do you log access to personal data? | **Yes** (infra console access + compliance webhook structured logs; see evidence map) |
| Do you have a security incident response policy? | **Yes** (see [Security incident response](#security-incident-response) below) |

### Audits and certifications

```text
None
```

---

## Level 1 / Level 2 evidence map

Shopify requirements → how ReviewTrix meets them.

### Level 1

| Requirement | Evidence |
| --- | --- |
| Minimum personal data | Order email + country code for requests; scopes only `read_orders,read_products,read_themes` |
| Inform merchants | Public privacy policy lists order-derived contact fields and purposes |
| Limit to stated purposes | Privacy: use solely for review collection, requests, moderation, widgets, billing, enabled integrations; no sale |
| Consent (where applicable) | Merchant configures requests; Shopify compliance webhooks anonymize/cancel on redact |
| Opt-out of data sale (where applicable) | We do not sell personal information → N/A in Partners form |
| Automated decision-making opt-out | Not used → N/A |
| Privacy / DPA with merchants | `/privacy` and `/terms` on app origin |
| Retention periods | Active while installed; `customers/redact` anonymizes; `shop/redact` ~48h after uninstall deletes shop data (`10_OPERATIONS.md`) |
| Encrypt at rest and in transit | HTTPS in production; Neon/S3 platform encryption; integration credentials AES-GCM |

### Level 2

| Requirement | Evidence |
| --- | --- |
| Encrypt backups | Neon continuous/PITR backups (operator: confirm enabled on prod project) |
| Separate test and production | Separate Neon databases / branches and Coolify env; no prod dumps into local/dev |
| DLP strategy | This runbook + least privilege, no PII in app logs, secrets in host env only |
| Limit staff access | Only operators who need prod/DB access have Neon/Coolify credentials |
| Strong staff passwords | MFA and strong passwords on staff accounts for prod systems |
| Access log | Coolify/Neon account access history; `privacy_customers_data_request` logs (IDs/counts, no emails) |
| Incident response policy | Section below |

Compliance webhooks (already implemented): `customers/data_request`,
`customers/redact`, `shop/redact` → `/webhooks/compliance`.

---

## DLP strategy

Data loss prevention here means stopping unauthorized **extraction or misuse** of
customer personal data (not only database restore). Neon handles DB durability
and encrypted backups; DLP is our application and operator controls.

Controls:

1. Request only scopes needed for the live product.
2. Store secrets in the host secret store / Coolify env — never in git.
3. Never log customer emails, access tokens, review bodies, or import CSV
   contents (`10_OPERATIONS.md`).
4. Limit Neon, Coolify, S3, and Resend production access to necessary staff.
5. Do not copy production personal data to personal machines, Slack, or shared
   inboxes; deliver data-request exports to the merchant over a secure channel.
6. On suspected credential leak: rotate secrets immediately and follow the
   incident response procedure below.
7. Optional integrations store credentials encrypted at rest
   (`INTEGRATIONS_ENCRYPTION_KEY`).

---

## Security incident response

Owner: Algorithm Trix Private Ltd — contact
`support.reviewtrix@algorithmtrix.com` (and Partner emergency contact).

### Severity (examples)

| Level | Examples |
| --- | --- |
| Sev-1 | Confirmed production PII exposure, ransomware, or mass unauthorized DB access |
| Sev-2 | Suspected credential leak, misconfigured public bucket, or unauthorized staff access |
| Sev-3 | Contained near-miss, failed login anomaly, or tooling misconfig with no confirmed exfiltration |

### Response steps

1. **Detect / report** — anyone who suspects an incident notifies the owner
   immediately.
2. **Contain** — revoke/rotate compromised credentials (Shopify app secret,
   `DATABASE_URL`, Resend, S3, Coolify); disable affected integrations; restrict
   network/access as needed.
3. **Preserve evidence** — keep relevant logs and timestamps; avoid destroying
   audit trails needed for investigation.
4. **Assess** — what data, which shops/customers, time window, root cause.
5. **Notify** — affected merchants as appropriate; escalate via Shopify Partner
   channels when required by Shopify or law; document what was shared.
6. **Remediate** — patch config/code, re-enable services only after verification.
7. **Postmortem** — short write-up: timeline, impact, fix, follow-ups (access
   review, backup restore drill, logging gaps).

---

## Operator checklist (Partners)

Complete in Shopify Partners (cannot be done from this repo):

1. Confirm **Distribution** is set (public / App Store) before requesting PCD.
2. Open **API access requests → Protected customer data access**.
3. Set reasons to **App functionality** + **Marketing or advertising** only;
   paste overall reason; **Save**.
4. Select **Email** only; paste email field reason; **Save**. Leave Name,
   Phone, Address unselected.
5. Open **Data protection details**; enter the answer key above (no required
   **No**); audits = `None`; **Save**.
6. Confirm Neon production project has PITR/backups enabled and test/prod DBs
   are separate.
7. For **development stores**: customer data for selected fields is available
   after steps 3–5 (no App Store submit required).
8. For **production / non-dev stores**: finish App Store listing submission so
   Shopify can approve PCD with the app review. Status may remain Draft until
   that review completes; the pink “confirm data protection details” message
   should clear once answers affirm Level 1 + Level 2.

If the pink banner persists after Save, re-open data protection details and
verify every required item is **Yes** or **Not applicable** as in this runbook
(especially “limit your use of personal data to that purpose”).
