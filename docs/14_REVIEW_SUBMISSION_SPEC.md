# Review Submission Specification

## Purpose

This document defines the complete review submission and customer identity workflow for the Shopify Review App.

The objective is to provide a seamless review experience comparable to leading Shopify review applications (Judge.me, Loox, Ali Reviews, etc.) while remaining fully compatible with Shopify's Customer, Order, and Customer Account systems.

This document is the single source of truth for all review submission logic. Any future implementation must follow these specifications.

---

# Design Principles

1. Never ask customers for information the application already knows.

2. Verified buyers should have the fastest and simplest review experience.

3. Guest visitors may review products only if allowed by merchant settings.

4. Customer identity should always come from Shopify whenever available.

5. Verified Buyer status must always be determined automatically.

6. Merchant settings control review permissions—not hardcoded application logic.

7. Review submission should minimize friction while maintaining trust.

---

# Review Submission Sources

Every review must originate from one of the following sources.

| Source | Description | Verified Buyer Eligible |
|---------|-------------|-------------------------|
| REVIEW_REQUEST | Review submitted from an email or SMS review request | ✅ Yes |
| STOREFRONT_LOGGED_IN | Logged-in Shopify customer submits review | ✅ If purchased |
| STOREFRONT_GUEST | Guest visitor submits review | ❌ No |
| IMPORT | Imported reviews | Merchant configurable |
| API | Public API submission | Depends on API configuration |

The review source must always be stored.

Example:

```ts
source: "REVIEW_REQUEST"
```

---

# Review Submission Flow 1
## Review Request (Primary Flow)

This is the preferred review submission flow.

```
Customer purchases product

↓

Shopify creates Order

↓

Application creates ReviewRequest

↓

Merchant sends Review Request

↓

Customer clicks secure review link

↓

Customer submits review
```

## Review Request Contains

- shopId
- orderId
- customerId
- customerName
- customerEmail
- productId
- secure token
- expiration date

Because customer identity is already known:

DO NOT ask for

- Display Name
- Email Address

The review form should open immediately.

Customer only enters:

- Rating
- Review Title
- Review Body
- Photos
- Videos

Upon submission:

- verifiedBuyer = true
- source = REVIEW_REQUEST

Customer identity must never be editable in this flow.

---

# Review Submission Flow 2
## Storefront Write Review

Customer clicks:

Write a Review

from the storefront.

The application determines which experience to display.

---

## Case A
### Logged-in Shopify Customer

Application retrieves:

- Customer ID
- First Name
- Last Name
- Email

Display Name automatically becomes:

```
John Doe
```

Email automatically becomes:

```
john@example.com
```

Do not display the About You modal.

Open the review form directly.

Customer enters:

- Rating
- Title
- Review
- Photos
- Videos

If merchant allows name editing, customer may modify only the Display Name.

If merchant disables editing, identity fields are read-only.

---

### Verified Purchase Check

If merchant enables:

Require Verified Purchase

Application checks whether the logged-in customer previously purchased the product.

If YES

```
verifiedBuyer = true
```

If NO

```
Display message:

Only verified purchasers can review this product.
```

Submission is blocked.

---

## Case B
### Guest Visitor

Customer is not logged in.

If guest reviews are enabled:

Display About You modal.

Collect:

Required

- Display Name

Optional or Required

- Email Address

Merchant controls whether email is optional.

After identity collection:

Open review form.

Submission:

```
verifiedBuyer = false
source = STOREFRONT_GUEST
```

---

## Case C
### Guest Reviews Disabled

Customer is not logged in.

Merchant disabled guest reviews.

Display message:

```
Please log in to leave a review.
```

Do not allow review submission.

---

# Verified Buyer Rules

A review is considered Verified Buyer only if:

Condition 1

Submitted from Review Request.

OR

Condition 2

Submitted by logged-in Shopify customer who has purchased the reviewed product.

Guest reviews can never become Verified Buyer.

Imported reviews may optionally preserve verified status if supported.

API reviews are determined by API authentication rules.

---

# Verified Buyer Badge

Whenever

```
verifiedBuyer == true
```

Display

```
✔ Verified Buyer
```

The badge should appear:

- Storefront review widget
- Individual review cards
- Product review pages
- Merchant dashboard

The badge is determined automatically.

Merchants cannot manually:

- Add it
- Remove it
- Edit it

---

# Customer Identity Priority

Whenever customer information is available, always use the following priority.

Priority 1

ReviewRequest

↓

Priority 2

Logged-in Shopify Customer

↓

Priority 3

Guest Input

Never use:

- Store name
- Browser information
- Device information
- Session guesses

Never attempt to infer customer identity.

---

# Merchant Settings

The application should support the following settings.

---

## Allow Guest Reviews

Default

Enabled

When disabled

Only logged-in customers may review.

---

## Require Verified Purchase

Default

Disabled

When enabled

Only customers with completed purchases may review.

Guest reviews are blocked.

---

## Require Guest Email

Default

Optional

Only affects guest reviews.

Ignored for:

- Logged-in customers
- Review Requests

---

## Allow Customer Name Editing

Default

Enabled

Controls whether logged-in customers can modify their display name.

Does not affect Review Request flow.

---

## Auto Publish Verified Reviews

Optional future setting.

If enabled

Verified reviews bypass moderation.

Otherwise

Verified reviews still follow moderation workflow.

---

# ReviewRequest Database Model

```
ReviewRequest

id

shopId

orderId

customerId

customerName

customerEmail

productId

token

status

expiresAt

submittedAt

createdAt

updatedAt
```

Status values

- PENDING
- SUBMITTED
- EXPIRED
- CANCELLED

---

# Review Database Model

```
Review

id

shopId

productId

customerId

customerName

customerEmail

rating

title

content

photos

videos

verifiedBuyer

source

status

featured

merchantReply

createdAt

updatedAt
```

---

# Review Status

Supported statuses

- Pending
- Published
- Hidden
- Rejected

Status should be independent of verification.

Example

Verified Buyer

+

Pending

is valid.

---

# UI Behaviour

## Review Request

Customer clicks email link.

↓

Review page opens immediately.

↓

No identity modal.

↓

Review form only.

---

## Logged-in Customer

Customer clicks

Write a Review

↓

Skip About You modal.

↓

Prefill customer identity.

↓

Open review form.

---

## Guest Visitor

Customer clicks

Write a Review

↓

Display About You modal.

↓

Collect identity.

↓

Open review form.

---

# Security

Review request links must use secure random tokens.

Tokens should:

- Expire
- Be single-use (recommended)
- Belong to one customer
- Belong to one order

Customer identity must never be accepted directly from the browser when using Review Requests.

Always verify token server-side.

---

# Future Compatibility

This architecture must remain compatible with:

- Shopify Customer Accounts
- Classic Customer Accounts
- Shop Pay
- Email Review Requests
- SMS Review Requests
- AI Moderation
- AI Review Summaries
- AI Fraud Detection
- Coupons After Review
- Referral Rewards
- Loyalty Programs
- Klaviyo
- Gorgias
- Public API
- Review Syndication
- Mobile Applications

No future feature should require redesigning the review submission architecture.

---

# Implementation Guidelines

Cursor should always:

- Prefer Shopify customer data over manual input.
- Reuse existing services whenever possible.
- Never duplicate identity logic.
- Keep review source and verification logic centralized.
- Store review source for every review.
- Automatically determine Verified Buyer status.
- Never allow merchants to manually change verification.
- Keep the review submission experience frictionless.
- Ensure all future features follow this specification.

---

# Summary

The application supports three customer experiences:

### Review Request

- Identity known
- No About You modal
- Verified Buyer
- Fastest experience

### Logged-in Customer

- Identity retrieved from Shopify
- No About You modal
- Verified if purchased

### Guest Visitor

- About You modal required
- Merchant-controlled permissions
- Never Verified Buyer

This document is the authoritative specification for all review submission functionality within the application.