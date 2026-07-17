# Database

## Shop

Stores merchant information.

Fields

id

shopDomain

shopifyShopId

accessToken

plan

createdAt

updatedAt

---

## Product

Optional cache.

Shopify remains source of truth.

---

## Review

id

shopId

productId

customerId

rating

title

body

status

verifiedPurchase

helpfulVotes

createdAt

updatedAt

---

## ReviewMedia

photo

video

thumbnail

reviewId

---

## ReviewReply

merchant reply

reviewId

---

## WidgetSettings

shopId

theme

colors

layout

sorting

pagination

---

## ReviewRequest

customer

order

email status

scheduledAt

---

## EmailCampaign

templates

subject

delay

---

## Analytics

daily reviews

average rating

conversion

review request success