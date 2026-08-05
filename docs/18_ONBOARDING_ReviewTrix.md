# ReviewTrix Merchant Onboarding Implementation Plan

## Objective

The onboarding experience should help merchants configure ReviewTrix in less than 5 minutes while requiring the fewest possible manual actions.

The onboarding must:

- Feel native inside Shopify Admin.
- Follow Shopify Polaris UX guidelines.
- Automatically detect completed steps whenever possible.
- Never overwhelm merchants with configuration options.
- Guide merchants toward collecting their first review as quickly as possible.

The merchant should never wonder:

> "What do I do next?"

---

# Overall Flow

```
Install ReviewTrix
        │
        ▼
Welcome Screen
        │
        ▼
Setup Guide (5 Steps)
        │
        ├── Theme Extension
        ├── Widget Placement
        ├── Import Reviews
        ├── Configure Review Requests
        └── Finish Setup
        │
        ▼
Dashboard
```

The onboarding appears only when:

- First install
- Setup not completed

Once finished:

- Merchant is redirected to Dashboard
- Onboarding never appears again
- Dashboard shows Setup Complete

---

# UX Principles

ReviewTrix onboarding should follow these principles.

## 1. One action per screen

Never show multiple forms.

Each screen should ask for one decision only.

Example:

Wrong

```
Theme
Email
Import
Widgets
Branding
```

Correct

```
Enable Theme Extension

[Enable]
```

---

## 2. Automatic Detection

Never ask merchants to click:

✓ Completed

Instead detect automatically.

Examples

Theme enabled

↓

Step completed

Widget added

↓

Step completed

Import finished

↓

Step completed

---

## 3. Progress Visibility

Always display

```
Setup Progress

██████░░░░░

3 / 5 Completed
```

Progress updates instantly.

---

# Welcome Screen

Purpose:

Introduce the app.

No configuration.

Minimal text.

---

## Layout

```
---------------------------------------

ReviewTrix Logo (reveiw public folder for logos)

Welcome to ReviewTrix

Collect authentic reviews.
Display them beautifully.
Increase conversions.

Estimated setup

⏱ 2–5 Minutes

★★★★★ Trusted by Shopify Merchants

[Start Setup]

Skip setup

---------------------------------------
```

Buttons

Primary

Start Setup

Secondary

Skip for now

Skipping should still allow merchant to access dashboard.

---

# Step 1

## Enable Theme App Extension

Purpose

Enable all storefront widgets.

Without this

Nothing appears on storefront.

---

## Layout

Large illustration

Title

```
Enable Theme App Extension
```

Description

```
Review widgets require Theme App Extension
to display on your storefront.
```

Button

```
Enable Extension
```

Opens

Shopify Theme Editor

---

Detection

Poll Shopify API.

When enabled

Automatically show

```
✓ Theme Extension Enabled
```

Button becomes

Continue

---

Database

```
theme_enabled = true
```

---

# Step 2

## Add First Widget

Purpose

Merchant should immediately see reviews.

---

Widget Options

```
Star Rating

Review List

Carousel

Review Gallery
```

Each option shows

- Preview
- Short description

---

Example

```
★★★★★

Star Rating

Display rating below products.

[Add]
```

---

After clicking

Use Theme App Extension APIs

Place block automatically when possible.

Otherwise

Open Theme Editor.

---

Detection

Detect widget placement.

If found

```
✓ Widget Added
```

Database

```
widget_added = true
```

---

# Step 3

## Import Existing Reviews

Purpose

Prevent empty storefront.

---

Show cards

```
Import from Judge.me

Import from Loox

Import from Ali Reviews

Import CSV

Skip
```

Each card

Logo

Description

Button

```
Import
```

---

CSV Flow

Upload

↓

Validate

↓

Preview

↓

Import

↓

Success

---

Progress

```
Imported

523 Reviews

█████████

Done
```

---

Errors

Show

```
12 duplicate reviews

Skipped automatically.
```

Never stop entire import.

---

Database

```
reviews_imported = true
```

---

# Step 4

## Configure Review Request Emails

Purpose

Start collecting new reviews immediately.

---

Settings

Review request timing

Dropdown

```
3 Days

5 Days

7 Days

Custom
```

---

Media

Checkbox

```
Allow Photos

Allow Videos
```

---

Reminder

```
Send Reminder

ON
```

---

Incentives

Optional

```
Reward customers

OFF
```

---

Email Preview

Live preview

Desktop

Mobile

---

Button

```
Save Configuration
```

Database

```
email_configured = true
```

---

# Step 5

## Finish Setup

Show summary

```
Theme

✓

Widgets

✓

Import

✓

Emails

✓
```

Animation

Confetti

Success check

Message

```
You're ready!

ReviewTrix is now collecting
and displaying reviews.
```

Buttons

```
Go to Dashboard

Visit Store
```

Database

```
onboarding_completed = true
```

Timestamp

```
completed_at
```

---

# Progress Tracking

Database Table

```
onboarding_status

id

shop

theme_enabled

widget_added

reviews_imported

email_configured

completed

completed_at

created_at

updated_at
```

---

# Auto Detection Logic

## Theme Extension

Use Shopify Theme APIs

Detect

```
Extension Enabled
```

---

## Widget Placement

Search

App Blocks

Theme JSON

---

## Review Import

Finished Job

↓

Completed

---

## Email Configuration

Configuration exists

↓

Completed

---

# Skip Logic

Merchant may skip

Import

Emails

Widget Selection

Never force completion.

Skipped steps appear

```
Skipped

Configure Later
```

Dashboard should still remind merchant.

---

# Empty States

No reviews

```
You haven't imported any reviews yet.

Import Reviews

or

Collect your first review.
```

---

No widgets

```
Your reviews aren't visible yet.

Add Widget
```

---

No email automation

```
Start collecting reviews automatically.

Configure Emails
```

---

# Polaris Components

Use

- Page
- Card
- Layout
- ProgressBar
- Badge
- Banner
- Button
- Text
- InlineStack
- BlockStack
- Divider
- Spinner
- DropZone
- Thumbnail
- ChoiceList
- Checkbox
- RadioButton
- Toast
- Modal

Avoid custom UI unless necessary.

---

# API Endpoints

```
GET
/api/onboarding/status
```

Returns

```
{
themeEnabled,
widgetAdded,
reviewsImported,
emailConfigured,
completed
}
```

---

```
POST
/api/onboarding/theme
```

---

```
POST
/api/onboarding/import
```

---

```
POST
/api/onboarding/email
```

---

```
POST
/api/onboarding/complete
```

---

# Loading States

Every action should show

Spinner

Disable buttons

Prevent duplicate requests

---

# Error Handling

Always explain errors.

Never show

```
500 Internal Server Error
```

Instead

```
Unable to connect to Shopify.

Please try again.
```

---

# Analytics Events

Track

```
Onboarding Started

Theme Enabled

Widget Added

Import Started

Import Completed

Email Configured

Onboarding Completed

Skipped Import

Skipped Emails
```

Useful for improving onboarding conversion.

---

# Accessibility

- Keyboard accessible.
- Focus management after each step.
- ARIA labels for all interactive elements.
- Minimum AA color contrast.
- Screen reader announcements for completed steps.
- Never rely on color alone to indicate progress.

---

# Performance

- Lazy-load illustrations.
- Fetch onboarding status in parallel.
- Poll Shopify only when required.
- Cache completed state.
- Minimize API calls during setup.

---

# Future Enhancements

- Interactive product tour after onboarding.
- AI-powered onboarding assistant.
- One-click migration from Judge.me.
- Video walkthrough for each setup step.
- Smart recommendations based on store type.
- Personalized checklist based on installed sales channels.
- Celebration screen after first published review.
- Email health checker.
- Theme compatibility checker.
- Automatic widget placement suggestions.

---

# Success Criteria

A successful onboarding means:

- Merchant completes setup in under 5 minutes.
- Theme Extension is enabled.
- At least one review widget is published.
- Review request automation is configured.
- Existing reviews (if any) are imported.
- Merchant reaches the dashboard with a fully functional ReviewTrix installation.
- Merchant is ready to collect and display reviews without additional configuration.

---

# Implementation log

## 2026-08-05 — Initial ship

Shipped:

- `OnboardingStatus` Prisma model + migration
- `onboardingService` + unit tests; ensure on shop install
- `/app/onboarding` UI (welcome → theme → widget → import → email → finish)
- Gate in `app.tsx`; slim layout during onboarding
- `GET/POST /api/onboarding/status`
- Theme Editor deep links; `read_themes` in `shopify.app.toml` / `.env.example`
- CSV import reuse; email save sets `emailConfigured`
- Finish: Pro trial form → `/app/billing`; continue Free → complete
- Dashboard setup-complete / finish-setup reminders
- Docs: `03_DATABASE`, `06_API`, `07_CHANGELOG`, `TODO`

Known gaps / mitigations:

- Judge.me/Loox/Ali are CSV-guided (no one-click OAuth)
- Carousel / Review Gallery not offered (blocks not shipped)
- Theme/widget auto-detect is best-effort; merchants can confirm manually
- Merchants must re-approve `read_themes` after scope deploy
- Analytics events log via `onboarding_event` structured logs (no third-party sink yet)