# Enable Storefront Widgets

Purpose

Allow ReviewTrix widgets to appear inside the merchant's theme.

This is the only required onboarding action.

---

Page Layout

Large illustration

Storefront preview

↓

Review widget highlighted

Title

Show reviews on your storefront

Description

ReviewTrix displays customer reviews directly on your product pages to increase trust and conversions.

Button

Open Theme Editor

---

Explanation Card

Before opening Shopify Theme Editor:

ReviewTrix will open Shopify's Theme Editor for the theme chosen on the store
health step (defaults to the live / MAIN theme).

Simply enable the ReviewTrix App Embed or App Block and click Save.

We'll detect the change automatically on that theme's `settings_data.json`
(falls back to MAIN when no selection cookie is present).

Note: the app only has `read_themes`. Choosing a theme configures ReviewTrix
against that theme; it does not publish or switch the storefront theme. Widgets
appear on the live theme — publish an unpublished theme in Shopify Themes after
enabling the embed if needed.

---

Theme Editor Flow

Merchant clicks

Open Theme Editor

↓

Shopify Theme Editor opens for the selected theme id
(`/admin/themes/{id}/editor`, not always `themes/current`)

↓

Merchant enables ReviewTrix

↓

Merchant clicks Save

↓

Returns automatically

↓

ReviewTrix detects success

---

Loading Screen

Checking Theme...

Spinner

Polling every 2 seconds

Maximum polling time

30 seconds

Fallback

Refresh Status

---

Success State

Green Check

Storefront widgets are enabled.

Your customers can now see reviews.

Button

Continue

---

Failure State

Unable to detect the Theme Extension.

Try refreshing or reopen the Theme Editor.

Buttons

Refresh Status

Open Theme Editor Again

---

Database

themeEnabled

Boolean

updatedAt

Timestamp