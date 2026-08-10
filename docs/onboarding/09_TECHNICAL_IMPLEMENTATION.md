# Technical Implementation

---

Database

Table

OnboardingStatus

Fields

id

shop

themeEnabled

automationConfigured

reviewsImported

brandingConfigured

completed

completedAt

createdAt

updatedAt

---

API

GET

/api/onboarding/status

Returns

themeEnabled

automationConfigured

reviewsImported

brandingConfigured

completed

progress

---

POST

/api/onboarding/theme

---

POST

/api/onboarding/import

---

POST

/api/onboarding/automation

---

POST

/api/onboarding/branding

---

POST

/api/onboarding/complete

---

Polling

Theme detection

Every 2 seconds

Maximum

30 seconds

Stop polling after success.

Detection reads `config/settings_data.json` on the theme selected during store
health (`rx_onboarding_theme` cookie). If unset, falls back to the MAIN theme.

Theme Editor URLs use `/admin/themes/{numericId}/editor` when a theme id is
known; otherwise `themes/current`.

---

Loading States

Disable buttons while requests are pending.

Display Polaris Spinner.

Prevent duplicate submissions.

---

Error Messages

Never expose raw server errors.

Instead use messages such as

Unable to connect to Shopify.

Please try again.

or

Import failed.

Your uploaded file couldn't be processed.

---

Analytics Events

Track

Onboarding Started

Welcome Completed

Theme Enabled

Import Started

Import Completed

Automation Enabled

Branding Customized

Checklist Completed

Onboarding Finished

Dashboard Opened

Skipped Import

Skipped Branding

Skipped Automation

---

Accessibility

Keyboard navigation

Visible focus states

Screen reader announcements

Minimum AA contrast

ARIA labels

Avoid color-only indicators

---

Performance

Lazy-load illustrations

Parallel API requests

Cache onboarding status

Minimize Shopify API calls

Persist onboarding progress immediately

---

Implementation Notes

The onboarding should feel like a guided experience, not a mandatory wizard.

Auto-detect every setup action whenever possible.

Merchants should never need to manually confirm that they completed a task.

Use Polaris components throughout the onboarding to maintain a native Shopify experience.

Animations should be lightweight, purposeful and reinforce progress rather than distract.

After onboarding is complete, merchants should never see the onboarding flow again unless they explicitly choose to restart it from Settings.

Future enhancements may include:

- AI-powered onboarding assistant
- Interactive product tour
- Theme compatibility checker
- One-click migrations
- Personalized onboarding based on store category
- Context-aware setup recommendations
- In-app video walkthroughs
- Smart widget placement suggestions
- First-review celebration flow