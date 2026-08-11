# ReviewTrix Lifecycle Email & Onboarding Implementation Plan

## Objective

Implement a reliable merchant lifecycle email system for ReviewTrix.

The lifecycle should be:

```text
INSTALL
  ↓
Welcome email — immediately
  ↓
24 hours
  ↓
If onboarding incomplete → Reminder #1
  ↓
72 hours from installation
  ↓
If onboarding incomplete → Reminder #2
  ↓
STOP

If onboarding completes at any point:
  ↓
Cancel/skip future reminders
  ↓
Send "You're all set 🎉" email immediately
```

The implementation must be database-driven and resilient to deployments, server restarts, duplicate jobs, failed email delivery, merchant uninstallation, and reinstallations.

---

# 1. Core Architecture

Use this architecture:

```text
                         SHOPIFY
                            │
                         OAuth
                            │
                            ▼
                     ReviewTrix API
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
              Merchant DB       Shopify Webhooks
                  │                   │
                  │              APP_UNINSTALLED
                  │                   │
                  ▼                   ▼
           Lifecycle Email       Update merchant
              Scheduler              status
                  │
                  ▼
             Email Queue
                  │
                  ▼
            Lifecycle Worker
                  │
                  ├──────────────┐
                  │              │
                  ▼              ▼
             Check DB        Check status
                  │              │
                  └──────┬───────┘
                         │
                         ▼
                       Resend
                         │
                         ▼
                    Merchant
```

### Architectural principle

The database is the source of truth.

The email system should never assume that an email must be sent simply because a scheduled time has arrived. Before sending, always re-check the merchant's current state.

---

# 2. Important Rules

Follow these rules throughout implementation:

1. Do NOT use `setTimeout()` for 24-hour or 3-day emails.
2. Store scheduled email jobs in the database.
3. Use a background worker/job system to process due emails.
4. Always check onboarding status immediately before sending.
5. Do not send onboarding reminders to merchants who already completed onboarding.
6. Do not send lifecycle emails after app uninstallation.
7. Prevent duplicate email jobs.
8. Make email sending idempotent.
9. Keep email templates separate from business logic.
10. Do not block the Shopify OAuth/install request while waiting for an email provider.
11. Onboarding completion must be persisted server-side.
12. Reinstallation must not automatically restart onboarding for a merchant who already completed it.
13. Keep lifecycle email state observable/debuggable.

---

# 3. Merchant Lifecycle

Use these onboarding states:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Lifecycle:

```text
Shopify installation
        ↓
Create/update merchant
        ↓
NOT_STARTED
        ↓
Merchant enters onboarding
        ↓
IN_PROGRESS
        ↓
Merchant completes onboarding
        ↓
COMPLETED
```

The welcome email is tied to installation, not onboarding completion.

The reminder emails are tied to incomplete onboarding.

The completion email is tied to successful onboarding completion.

---

# 4. Database Design

## Merchant

Extend the existing merchant/shop model instead of creating duplicate merchant records.

Conceptually:

```prisma
model Merchant {
  id                       String   @id @default(cuid())
  shopDomain               String   @unique
  shopifyShopId            String?
  email                    String?

  firstInstalledAt         DateTime
  latestInstalledAt        DateTime
  uninstalledAt            DateTime?

  onboardingStatus         OnboardingStatus @default(NOT_STARTED)
  onboardingStartedAt      DateTime?
  onboardingCompletedAt    DateTime?

  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  lifecycleEmails          LifecycleEmail[]
}
```

Adapt this to the project's existing ORM/schema conventions.

Do not blindly replace the existing schema.

---

# 5. Lifecycle Email Model

Create a lifecycle email/job table.

Conceptually:

```prisma
model LifecycleEmail {
  id                  String   @id @default(cuid())

  merchantId          String
  merchant             Merchant @relation(...)

  type                LifecycleEmailType
  status              LifecycleEmailStatus

  scheduledFor        DateTime

  sentAt              DateTime?
  failedAt            DateTime?

  providerMessageId   String?
  attemptCount        Int      @default(0)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([merchantId, type])
}
```

Use the project's existing relation syntax and naming conventions.

## Email types

```text
WELCOME
ONBOARDING_REMINDER_24H
ONBOARDING_REMINDER_3D
ONBOARDING_COMPLETED
```

## Email statuses

```text
SCHEDULED
PROCESSING
SENT
FAILED
CANCELLED
```

The unique constraint on:

```text
merchantId + type
```

is important to prevent accidental duplicate lifecycle emails.

---

# 6. Installation Flow

Use the existing Shopify OAuth flow.

After successful OAuth/authentication:

```text
Shopify OAuth
     ↓
Existing auth callback / afterAuth
     ↓
Get shop information
     ↓
Find merchant by shop domain
```

## New installation

If the merchant does not exist:

```text
Create merchant
  ↓
onboardingStatus = NOT_STARTED
  ↓
firstInstalledAt = now()
latestInstalledAt = now()
  ↓
Create WELCOME email job
  ↓
Create ONBOARDING_REMINDER_24H job
  ↓
Create ONBOARDING_REMINDER_3D job
```

Scheduling:

```text
WELCOME
scheduledFor = now()

ONBOARDING_REMINDER_24H
scheduledFor = first/latest installation + 24 hours

ONBOARDING_REMINDER_3D
scheduledFor = first/latest installation + 72 hours
```

Use the installation event that represents the current onboarding journey according to the existing app's reinstall behavior.

## Existing merchant

If the merchant already exists:

- Update `latestInstalledAt`.
- Clear `uninstalledAt`.
- Do NOT automatically reset `onboardingStatus`.
- If onboarding was already completed, do not create a new onboarding reminder sequence.
- If onboarding was not completed, resume appropriately rather than creating duplicate jobs.

---

# 7. Do Not Send Email Directly From OAuth

Do not do this:

```text
OAuth callback
  ↓
Wait for Resend
  ↓
Send email
  ↓
Redirect merchant
```

Instead:

```text
OAuth callback
  ↓
Save merchant
  ↓
Create lifecycle email job
  ↓
Redirect merchant
```

Then:

```text
Background worker
  ↓
Process email job
  ↓
Resend
```

This prevents an email provider failure from breaking merchant installation.

---

# 8. Welcome Email

Send immediately after successful installation.

## Subject

```text
Welcome to ReviewTrix 🎉
```

## Suggested content

```text
Hi {{shop_name}},

Welcome to ReviewTrix!

Your store is now connected and you're ready to start
collecting and displaying customer reviews.

Let's get your review experience set up.

[Complete setup]

— The ReviewTrix Team
```

The CTA should deep-link to the ReviewTrix onboarding screen.

Do not hard-code a URL without checking the project's existing routing.

## Absolutely. I’d add a **dedicated email-design section** so Cursor understands that the emails shouldn't just be functional—they should visually feel like a polished SaaS product such as ReviewTrix.

You can add this directly after the **Welcome Email** section:

````md
# 8.1. Professional Email Styling & Design

The lifecycle emails must look like polished, production-grade SaaS product emails, not plain transactional emails.

The visual identity should feel consistent with the existing ReviewTrix brand and dashboard.

## Design Goals

The email should communicate:

- Professional
- Premium
- Modern SaaS
- Trustworthy
- Clean
- Minimal
- Friendly
- Consistent with ReviewTrix branding

Do not create a generic-looking HTML email template.

Before implementing the design, inspect the existing ReviewTrix application UI and reuse its established:

- Brand colors
- Logo
- Typography
- Border radius
- Card styling
- Button styling
- Background treatment
- Visual hierarchy
- Overall design language

The email should feel like it belongs to the same product as the ReviewTrix dashboard.

---

## Email Layout

Use a responsive, centered email layout that works well on:

- Gmail
- Outlook
- Apple Mail
- Mobile email clients
- Desktop email clients

Recommended structure:

```text
┌───────────────────────────────────────┐
│                                       │
│             ReviewTrix                │
│                                       │
├───────────────────────────────────────┤
│                                       │
│        Welcome to ReviewTrix 🎉       │
│                                       │
│  Hi {{shop_name}},                    │
│                                       │
│  Welcome to ReviewTrix!               │
│                                       │
│  Your store is now connected and      │
│  you're ready to start collecting     │
│  and displaying customer reviews.     │
│                                       │
│        ┌───────────────────┐          │
│        │   Complete setup  │          │
│        └───────────────────┘          │
│                                       │
│  Let's get your review experience     │
│  set up.                              │
│                                       │
├───────────────────────────────────────┤
│                                       │
│  ReviewTrix                           │
│  Review management made simple.       │
│                                       │
└───────────────────────────────────────┘
````

This is only a structural reference. Use the actual ReviewTrix visual language when implementing it.

---

## Header

Create a clean branded header.

Prefer:

* ReviewTrix logo
* Appropriate logo sizing
* Plenty of whitespace
* Minimal navigation
* No unnecessary decorative elements

Do not make the header look like a marketing newsletter.

The email should immediately feel like an important product communication from ReviewTrix.

---

## Main Content

Keep the content inside a visually focused email container.

Recommended characteristics:

* White or appropriate neutral content surface
* Subtle border
* Soft corner radius where supported
* Comfortable horizontal padding
* Generous vertical spacing
* Clear typography hierarchy
* Short paragraphs
* Strong CTA

Avoid excessive shadows, gradients, illustrations, or decorative elements.

The email should remain elegant and professional.

---

## Heading

Use:

```text
Welcome to ReviewTrix 🎉
```

The heading should be visually prominent but not oversized.

Use the same or a closely related font hierarchy to the ReviewTrix dashboard where technically appropriate.

Remember that custom fonts have inconsistent support across email clients. Use a robust fallback stack.

---

## Body Copy

Use:

```text
Hi {{shop_name}},

Welcome to ReviewTrix!

Your store is now connected and you're ready to start
collecting and displaying customer reviews.

Let's get your review experience set up.
```

Improve spacing and line-height for readability.

Do not make the email unnecessarily long.

---

## Primary CTA

Use:

```text
Complete setup
```

The CTA should look like the primary ReviewTrix action button.

It should:

* Have strong visual contrast
* Have comfortable padding
* Have rounded corners consistent with ReviewTrix
* Use clear button text
* Be large enough for mobile tapping
* Be centered or appropriately positioned
* Have an accessible color contrast

Do not use a raw URL as visible text.

The CTA must deep-link to the ReviewTrix onboarding screen.

IMPORTANT:

Do not hard-code the onboarding URL.

Inspect the existing ReviewTrix routing implementation and generate/use the correct onboarding URL based on the actual application route.

If the app uses a specific embedded Shopify app route, preserve that routing structure.

---

## Brand Color

Use the existing ReviewTrix brand palette.

Do not invent a completely new email color palette.

The email should visually connect with the current ReviewTrix dashboard and marketing site.

If the existing application uses a green/teal premium visual direction, use that established palette carefully rather than introducing unrelated colors.

Prefer:

* One primary brand color
* Neutral background
* Neutral text
* Subtle secondary text
* Minimal accent usage

Avoid excessive use of gradients or bright colors.

---

## Footer

Add a minimal professional footer.

Example:

```text
ReviewTrix
Review management made simple.

© {{current_year}} ReviewTrix
```

If the application already has an official support URL or website route, use the existing configuration rather than hard-coding a new URL.

Potential footer links, only if they already exist in the application:

```text
Help Center · Support · ReviewTrix
```

Do not add unnecessary marketing links.

---

## Responsive Design

The email must be responsive.

On mobile:

* Reduce horizontal padding appropriately
* Keep the CTA easy to tap
* Prevent text from becoming too small
* Keep the logo properly sized
* Prevent horizontal scrolling
* Ensure the content fits within narrow screens

Use email-safe responsive CSS.

Do not rely on modern browser-only CSS features that have poor email-client support.

---

## Email Client Compatibility

Prioritize compatibility over visual complexity.

The email should render correctly in:

* Gmail
* Outlook
* Apple Mail
* iOS Mail
* Android email clients

Avoid depending on:

* JavaScript
* External interactive components
* Complex animations
* Unsupported CSS
* Background video
* Hover-only interactions

The email should remain attractive even when advanced CSS is not supported.

---

## Accessibility

Follow basic email accessibility best practices.

Ensure:

* Sufficient color contrast
* Meaningful heading hierarchy
* Descriptive image alt text
* CTA is understandable without surrounding context
* Text is readable on mobile
* Images are not required to understand the message
* The email remains usable if images are blocked

The CTA should clearly communicate its action:

```text
Complete setup
```

rather than:

```text
Click here
```

---

## Logo and Images

Use the official ReviewTrix logo from the existing project assets.

Do not recreate or approximate the logo using text if a proper logo asset already exists.

Inspect the existing project for:

```text
logo
favicon
brand assets
email assets
public assets
```

Use the appropriate production asset.

Do not embed huge images.

Optimize image dimensions and file size for email delivery.

If an image is not necessary, prefer a clean text-based design.

---

## Dark Mode

Consider email-client dark mode behavior.

The email should remain readable when the user's email client applies dark mode transformations.

Do not rely on a single hard-coded white/black combination if it causes readability issues under automatic dark-mode transformations.

Test the email in both:

```text
Light mode
Dark mode
```

where possible.

---

## Overall Visual Direction

The final email should feel similar to a premium modern SaaS onboarding email.

Think:

```text
Minimal
+
Premium
+
Branded
+
Friendly
+
Product-focused
```

Avoid:

```text
Generic newsletter
+
Excessive marketing graphics
+
Stock imagery
+
Large hero banners
+
Too many colors
+
Dense text
+
Overly decorative UI
```

The merchant should immediately recognize:

> "This is a professional email from the ReviewTrix product I just installed."

---

## Reuse This Design System

Do not create four completely different email designs.

All lifecycle emails should share the same email design system:

```text
Welcome email
      ↓
Same header
      ↓
Same typography
      ↓
Same content container
      ↓
Same CTA style
      ↓
Same footer


24h reminder
      ↓
Same design system


3-day reminder
      ↓
Same design system


Onboarding completed
      ↓
Same design system
```

Only the content, heading, supporting copy, and CTA destination/action should change.

---

## Email Preview / Testing

Before finalizing the implementation, render and inspect every lifecycle email.

Verify:

* Desktop appearance
* Mobile appearance
* Logo rendering
* CTA appearance
* Typography
* Spacing
* Brand colors
* Dark mode
* Long shop names
* Missing optional data
* Link correctness

At minimum, test these four templates:

```text
1. Welcome to ReviewTrix 🎉

2. Your ReviewTrix setup is waiting

3. Need help getting ReviewTrix live?

4. You're all set with ReviewTrix 🎉
```

All four should look like they belong to the same professional ReviewTrix email system.

```

### I would also make one small change to the original welcome email section

Instead of just:

> "Create a template."

tell Cursor explicitly:

> **Before designing the email, inspect the existing ReviewTrix dashboard and brand assets and derive the email's visual language from them. Do not invent a separate design system for emails.**

That's especially important for your current ReviewTrix design, because you already have a **premium greenish dashboard aesthetic**. The email should feel like an extension of that product rather than a generic Resend/React Email template.
```


---

# 9. 24-Hour Reminder

Schedule for:

```text
installation time + 24 hours
```

When the worker processes this job, check:

```text
Does merchant exist?
Is app still installed?
Does merchant have an email?
Is onboardingStatus COMPLETED?
Is this lifecycle job already SENT/CANCELLED?
```

If onboarding is completed:

```text
CANCEL / SKIP
```

If onboarding is incomplete:

```text
SEND
```

## Suggested subject

```text
Your ReviewTrix setup is waiting
```

## Suggested content

```text
Hi {{shop_name}},

You're almost there.

Your ReviewTrix setup hasn't been completed yet.
Finish the remaining steps and start getting more value
from your customer reviews.

[Continue setup]

— The ReviewTrix Team
```

Do not claim that the merchant "hasn't logged in" unless the system actually tracks and can prove that.

Use "setup isn't complete" instead.

---

# 10. Three-Day Reminder

Schedule for:

```text
installation time + 72 hours
```

Again, check current eligibility immediately before sending.

If onboarding is complete:

```text
CANCEL / SKIP
```

If still incomplete:

```text
SEND
```

## Suggested subject

```text
Need help getting ReviewTrix live?
```

## Suggested content

```text
Hi {{shop_name}},

We noticed your ReviewTrix setup isn't complete yet.

If you ran into a problem or aren't sure what to do next,
we're here to help.

[Continue setup]

Need help?
[Contact support]

— The ReviewTrix Team
```

This email should feel more like assistance than another aggressive reminder.

After this email, stop the automatic onboarding reminder sequence.

---

# 11. Onboarding Start

When the merchant starts onboarding:

```text
POST /api/onboarding/start
```

Update:

```text
onboardingStatus = IN_PROGRESS
onboardingStartedAt = now()
```

Make this server-side.

Do not rely on:

```text
localStorage
React state
cookies alone
```

for the source of truth.

---

# 12. Onboarding Progress

Persist important onboarding progress server-side.

Use the project's existing onboarding structure if one already exists.

Possible step tracking:

```text
welcome_completed
review_import_completed
widget_setup_completed
branding_completed
review_request_setup_completed
...
```

Do not create duplicate onboarding systems if the project already has one.

The lifecycle email system only needs enough information to determine whether onboarding is complete.

---

# 13. Onboarding Completion

When the merchant completes onboarding:

```text
POST /api/onboarding/complete
```

Backend should:

```text
1. Verify the merchant/session.
2. Update onboardingStatus = COMPLETED.
3. Set onboardingCompletedAt = now().
4. Cancel pending onboarding reminder jobs.
5. Create/queue ONBOARDING_COMPLETED email.
```

The completion email should be sent immediately through the normal email worker/queue.

Do not wait for the 24h/72h scheduler.

---

# 14. Completion Email

## Subject

```text
You're all set with ReviewTrix 🎉
```

## Suggested content

```text
Hi {{shop_name}},

Your ReviewTrix setup is complete.

Your store is ready to collect, manage and display
customer reviews.

[Open ReviewTrix]

— The ReviewTrix Team
```

Only send this once per onboarding completion event.

Do not create duplicate completion emails if the completion endpoint is called twice.

Use a database constraint/idempotency mechanism.




---

# 15. Email Eligibility

Before sending ANY lifecycle email, run a final eligibility check.

Conceptually:

```javascript
function canSendLifecycleEmail(merchant, email) {
  if (!merchant) return false;

  if (merchant.uninstalledAt !== null) {
    return false;
  }

  if (!merchant.email) {
    return false;
  }

  if (
    email.type === "ONBOARDING_REMINDER_24H" ||
    email.type === "ONBOARDING_REMINDER_3D"
  ) {
    if (merchant.onboardingStatus === "COMPLETED") {
      return false;
    }
  }

  if (email.status !== "SCHEDULED") {
    return false;
  }

  return true;
}
```

Adapt this to the project's actual types and architecture.

The status check is the safety mechanism.

Cancelling future jobs is an optimization.

---

# 16. Do Not Use setTimeout()

Never implement:

```javascript
setTimeout(() => {
  sendEmail();
}, 24 * 60 * 60 * 1000);
```

Why:

```text
Server running
   ↓
Timer created
   ↓
Server restarts/deploys
   ↓
Timer disappears
   ↓
Email never sends
```

Instead save:

```text
scheduledFor = timestamp
```

in the database.

Then a worker processes due jobs.

---

# 17. Lifecycle Email Worker

Implement a background worker/job processor using the project's existing infrastructure if available.

If there is no existing queue, a database-backed worker is acceptable.

Conceptual logic:

```javascript
while (true) {
  const jobs = await getDueLifecycleEmails();

  for (const job of jobs) {
    await processLifecycleEmail(job);
  }

  await sleep(30_000);
}
```

In production, prefer a proper queue/job system such as BullMQ + Redis or the project's existing job infrastructure.

Do not create a second job system if one already exists in the application.

---

# 18. Job Processing

Conceptually:

```text
SCHEDULED
    ↓
Atomically claim job
    ↓
PROCESSING
    ↓
Check merchant eligibility
    ↓
Render template
    ↓
Send through email provider
    ↓
SUCCESS
    ↓
SENT
```

On failure:

```text
PROCESSING
    ↓
ERROR
    ↓
Retry
```

After retry limit:

```text
FAILED
```

Use an atomic claim/lock so two workers cannot process the same job simultaneously.

---

# 19. Retries

Email sending can fail.

Implement retry handling.

Suggested retry schedule:

```text
Attempt 1 → immediately
Attempt 2 → +5 minutes
Attempt 3 → +30 minutes
Attempt 4 → +2 hours
```

After the maximum number of attempts:

```text
FAILED
```

Record:

```text
attemptCount
failedAt
error/reason
```

if the existing schema/logging strategy supports it.

Never mark an email `SENT` until the provider successfully accepts it.

---

# 20. Resend Integration

If the project is using Resend, create a dedicated email service rather than calling Resend directly from multiple business modules.

Conceptual API:

```text
sendLifecycleEmail({
  type,
  merchant,
  idempotencyKey
})
```

The service should:

1. Select the correct template.
2. Render merchant-specific values.
3. Send the email.
4. Return the provider message ID.
5. Allow errors to propagate to the worker.
6. Support idempotency.

Use deterministic idempotency keys such as:

```text
welcome:merchant_123
reminder24:merchant_123
reminder3d:merchant_123
completed:merchant_123
```

If the provider supports idempotency, use it.

Do not hard-code API keys.

Use environment variables.

---

# 21. Email Templates

Keep templates separate from business logic.

Suggested structure:

```text
emails/
├── welcome/
│   ├── subject.ts
│   └── template.tsx
│
├── onboarding-reminder-24h/
│   ├── subject.ts
│   └── template.tsx
│
├── onboarding-reminder-3d/
│   ├── subject.ts
│   └── template.tsx
│
└── onboarding-completed/
    ├── subject.ts
    └── template.tsx
```

Adapt the structure to the existing project.

Do not introduce a new email framework if the project already has one.

---

# 22. Shopify APP_UNINSTALLED Webhook

Implement the Shopify app-uninstalled webhook.

Flow:

```text
Merchant uninstalls ReviewTrix
             ↓
Shopify
             ↓
APP_UNINSTALLED
             ↓
ReviewTrix webhook
             ↓
merchant.uninstalledAt = now()
             ↓
Cancel pending lifecycle emails
```

The worker must also check `uninstalledAt` before sending.

This creates two layers of protection:

```text
Webhook cancellation
+
Worker eligibility check
```

Do not send lifecycle emails to a merchant after uninstallation.

Also preserve the existing mandatory Shopify compliance/privacy webhooks and requirements already implemented by the app.

---

# 23. Reinstallation

Handle reinstall carefully.

Example:

```text
Aug 1
Install

Aug 2
Uninstall

Aug 10
Reinstall
```

When the merchant is found again:

```text
Update latestInstalledAt
Clear uninstalledAt
```

Then inspect previous onboarding state.

If:

```text
onboardingStatus = COMPLETED
```

do NOT restart the onboarding sequence.

If:

```text
onboardingStatus = NOT_STARTED
or
IN_PROGRESS
```

resume/create the appropriate sequence without creating duplicates.

Do not automatically send:

```text
"Welcome! Let's set up ReviewTrix"
```

to a merchant who already completed onboarding unless a separate "welcome back" lifecycle is intentionally designed.

---

# 24. First vs Latest Installation

Keep both:

```text
firstInstalledAt
latestInstalledAt
```

Do not overwrite the original installation timestamp every time the merchant reinstalls.

This gives useful lifecycle history.

Example:

```text
firstInstalledAt = Aug 1
latestInstalledAt = Aug 10
```

---

# 25. Duplicate Protection

Protect against:

- Duplicate OAuth callbacks
- Multiple install events
- Duplicate onboarding completion requests
- Multiple worker instances
- Worker retries
- Server restarts

Use:

```text
Database unique constraints
+
Atomic job claiming
+
Idempotency keys
+
Server-side onboarding state
```

Do not rely on frontend checks for duplicate prevention.

---

# 26. Suggested API Endpoints

Use the project's existing route conventions.

Potential endpoints:

```text
POST /api/onboarding/start
POST /api/onboarding/complete
PATCH /api/onboarding/progress
```

Shopify webhook:

```text
POST /webhooks/app/uninstalled
```

If a dedicated internal worker endpoint is needed:

```text
POST /internal/process-lifecycle-emails
```

The internal worker endpoint must be authenticated and must not be publicly usable.

If the project already has a queue worker, use that instead.

---

# 27. Internal Admin/Debug View

If practical, add an internal lifecycle email view.

Example:

```text
Lifecycle Emails

Merchant             Type                    Status
---------------------------------------------------------
ABC Store             Welcome                 SENT
XYZ Store             24h Reminder            SCHEDULED
Fashion Store         3d Reminder             CANCELLED
Demo Store             Completed               SENT
```

Merchant detail:

```text
ABC Store

Installation
----------------
Installed: Aug 11, 10:32 AM

Onboarding
----------------
Status: IN_PROGRESS
Step: 4 / 7

Emails
----------------
✓ Welcome                 Aug 11 10:33
○ 24h Reminder             Scheduled
○ 3d Reminder              Scheduled
```

This is highly useful for support/debugging.

If adding a UI is too much for the current scope, at minimum make the lifecycle email state available through logs/database inspection.

---

# 28. Logging

Add structured logs around lifecycle events.

Examples:

```text
merchant.lifecycle.install
merchant.lifecycle.onboarding_started
merchant.lifecycle.onboarding_completed

lifecycle_email.scheduled
lifecycle_email.processing
lifecycle_email.sent
lifecycle_email.skipped
lifecycle_email.failed
lifecycle_email.cancelled
```

Include useful identifiers:

```text
merchantId
shopDomain
emailType
jobId
providerMessageId
```

Do not log sensitive data unnecessarily.

Never log API keys or access tokens.

---

# 29. Exact Lifecycle Examples

## Example A — Merchant never completes onboarding

```text
Day 0
Install
↓
Welcome email

Day 1
Onboarding still incomplete
↓
24h reminder

Day 3
Onboarding still incomplete
↓
3-day reminder

After Day 3
↓
No more automatic onboarding emails
```

---

## Example B — Merchant completes immediately

```text
Day 0
Install
↓
Welcome email

30 minutes later
Complete onboarding
↓
Status = COMPLETED
↓
Cancel/skip reminder jobs
↓
Send completion email
```

The next day's worker sees:

```text
COMPLETED
```

and sends nothing.

---

## Example C — Merchant completes at 23h59m

```text
Install
↓
23h59m later
Complete onboarding
↓
Status = COMPLETED
↓
Completion email
```

At 24h:

```text
Worker
↓
Checks status
↓
COMPLETED
↓
Skip reminder
```

---

## Example D — Merchant uninstalls before reminder

```text
Install
↓
Welcome
↓
Uninstall
↓
APP_UNINSTALLED
↓
uninstalledAt = now()
↓
Cancel reminder jobs
```

Even if a stale job somehow remains:

```text
Worker
↓
Checks uninstalledAt
↓
Skip
```

---

## Example E — Merchant reinstalls after completing onboarding

```text
Install
↓
Complete onboarding
↓
Uninstall
↓
Reinstall later
```

Result:

```text
onboardingStatus = COMPLETED
```

Do not restart the onboarding reminder sequence.

---

# 30. Email Timing

Use:

```text
WELCOME
Immediately after successful installation

ONBOARDING_REMINDER_24H
Installation + 24 hours

ONBOARDING_REMINDER_3D
Installation + 72 hours

ONBOARDING_COMPLETED
Immediately when onboarding completes
```

The 3-day email is **72 hours from installation**, not 72 hours after the first reminder.

Final sequence:

```text
INSTALL
  ↓
Welcome
  ↓
+24h
  ↓
Reminder #1
  ↓
+48h
  ↓
Reminder #2
  ↓
STOP
```

---

# 31. Compliance and Email Intent

Keep transactional/onboarding emails distinct from marketing emails.

These emails are directly related to the merchant's installation and setup of ReviewTrix.

Do not turn this system into a general marketing email system without separately considering:

- consent requirements
- unsubscribe requirements
- Shopify requirements
- applicable email laws
- your email provider's policies

If marketing emails are introduced later, build a separate preference/consent system.

---

# 32. Environment Variables

Use the existing environment-variable conventions.

Potential values:

```text
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=
```

If the worker requires separate configuration, use the project's existing environment setup.

Never commit secrets.

---

# 33. Deployment Architecture

Because ReviewTrix is deployed using Coolify, a clean production setup can be:

```text
Coolify
│
├── ReviewTrix Web/API
│
└── ReviewTrix Worker
```

The worker shares access to:

```text
Database
Redis/Queue if used
Email provider
```

If the current deployment architecture already has a background worker or scheduler, reuse it.

Do not create unnecessary infrastructure.

---

# 34. Testing Plan

Before considering this feature complete, test all of these.

### Installation

- [ ] New merchant installation
- [ ] OAuth callback creates merchant
- [ ] Welcome job created
- [ ] 24h job created
- [ ] 3-day job created
- [ ] Duplicate OAuth does not duplicate jobs

### Onboarding

- [ ] Start onboarding
- [ ] Progress persists
- [ ] Complete onboarding
- [ ] Completion status persists
- [ ] Completion email is queued
- [ ] Reminder jobs are cancelled/skipped

### Worker

- [ ] Due jobs are processed
- [ ] Future jobs are not processed
- [ ] Jobs are atomically claimed
- [ ] Duplicate workers cannot send duplicates
- [ ] Failed emails retry
- [ ] Permanently failed emails become FAILED

### Uninstallation

- [ ] APP_UNINSTALLED is received
- [ ] Merchant is marked uninstalled
- [ ] Pending jobs are cancelled
- [ ] Worker skips stale jobs

### Reinstallation

- [ ] Existing merchant is found
- [ ] latestInstalledAt updates
- [ ] firstInstalledAt remains unchanged
- [ ] Completed onboarding is not restarted
- [ ] Incomplete onboarding resumes correctly

### Edge cases

- [ ] Merchant completes at 23h59m
- [ ] Worker restarts
- [ ] API restarts
- [ ] Email provider temporarily fails
- [ ] Merchant has no usable email
- [ ] Completion endpoint called twice
- [ ] Worker processes the same job twice

---

# 35. Implementation Order

Implement in this order.

## Phase 1 — Inspect Existing Code

Before modifying anything:

1. Identify the Shopify app framework.
2. Identify OAuth/auth implementation.
3. Identify merchant/shop database model.
4. Identify current onboarding implementation.
5. Identify existing API routes.
6. Identify existing background jobs/queues.
7. Identify whether an email provider already exists.
8. Identify existing Shopify webhook implementation.
9. Identify current deployment structure.
10. Reuse existing infrastructure wherever possible.

Do not create duplicate systems.

---

## Phase 2 — Database

1. Extend merchant/shop model.
2. Add onboarding lifecycle fields if missing.
3. Create lifecycle email/job model.
4. Add enums.
5. Add unique constraints.
6. Run migration.
7. Verify existing data is preserved.

---

## Phase 3 — Installation Lifecycle

1. Update OAuth success/afterAuth flow.
2. Create/update merchant.
3. Record installation timestamps.
4. Create lifecycle email jobs.
5. Make creation idempotent.
6. Do not block OAuth response on email delivery.

---

## Phase 4 — Onboarding Lifecycle

1. Connect existing onboarding start logic.
2. Persist `IN_PROGRESS`.
3. Connect existing onboarding completion logic.
4. Persist `COMPLETED`.
5. Cancel/skip reminder jobs.
6. Queue completion email.
7. Ensure duplicate completion requests are safe.

---

## Phase 5 — Email Service

1. Configure Resend if not already configured.
2. Verify sending domain/configuration.
3. Build email service abstraction.
4. Build templates.
5. Add idempotency.
6. Store provider message ID.
7. Add error handling.

---

## Phase 6 — Worker

1. Implement due-job query.
2. Implement atomic job claiming.
3. Implement eligibility checks.
4. Implement email rendering.
5. Send through provider.
6. Mark SENT.
7. Retry failures.
8. Mark permanently failed jobs.
9. Add structured logs.

---

## Phase 7 — Shopify Webhooks

1. Implement/verify APP_UNINSTALLED.
2. Update merchant state.
3. Cancel pending lifecycle emails.
4. Keep worker-level uninstallation protection.
5. Preserve existing mandatory compliance webhooks.

---

## Phase 8 — Reinstall Handling

1. Test merchant lookup by shop domain/Shopify ID.
2. Preserve first installation date.
3. Update latest installation date.
4. Clear uninstalled state.
5. Do not restart completed onboarding.
6. Resume incomplete onboarding correctly.

---

## Phase 9 — Testing

Run the complete test matrix above.

Do not consider the feature complete until failure/restart/duplicate scenarios work.

---

# 36. Cursor Implementation Instructions

When implementing this plan:

### First

Inspect the repository and understand the existing architecture.

Do NOT immediately create new files.

Identify:

- framework
- database
- ORM
- authentication/OAuth
- onboarding implementation
- existing email infrastructure
- existing webhook infrastructure
- queue/worker infrastructure
- deployment configuration

### Second

Create a concise implementation plan based on the actual repository.

If an existing component already solves part of this problem, extend it instead of creating a parallel system.

### Third

Implement incrementally.

After each major phase:

1. Run type checking.
2. Run linting.
3. Run relevant tests.
4. Fix errors before continuing.

### Fourth

Do not change unrelated UI or application behavior.

The scope is:

```text
Shopify installation
+
merchant lifecycle state
+
onboarding state
+
lifecycle emails
+
email worker
+
uninstallation handling
+
reinstall handling
```

Avoid unrelated refactors.

---

# 37. Definition of Done

This feature is complete when:

- [ ] A new merchant installs ReviewTrix.
- [ ] Merchant is persisted correctly.
- [ ] Welcome email is queued immediately.
- [ ] 24h reminder is scheduled.
- [ ] 3-day reminder is scheduled.
- [ ] Merchant can complete onboarding at any time.
- [ ] Completion is persisted server-side.
- [ ] Completion immediately triggers the completion email.
- [ ] Future reminder emails are cancelled/skipped after completion.
- [ ] Uninstalled merchants receive no future lifecycle emails.
- [ ] Reinstalling a previously completed merchant does not restart onboarding.
- [ ] Email jobs survive server restarts/deployments.
- [ ] Duplicate jobs are prevented.
- [ ] Duplicate sends are protected with idempotency.
- [ ] Email failures retry correctly.
- [ ] Permanent failures are visible.
- [ ] Lifecycle events are logged.
- [ ] Existing ReviewTrix onboarding behavior remains intact.
- [ ] Existing Shopify webhooks/compliance behavior remains intact.
- [ ] No secrets are hard-coded.
- [ ] Type checking/linting/tests pass.

---

# 38. Final Expected Behavior

The final merchant experience should be:

```text
Merchant installs ReviewTrix
        ↓
Welcome email
        ↓
Merchant enters onboarding
        ↓
Onboarding progress saved
        ↓
        ┌─────────────────────────────┐
        │                             │
        ▼                             ▼
Completes onboarding            Doesn't complete
        │                             │
        ▼                             ▼
"You're all set 🎉"              24h reminder
                                      │
                                      ▼
                              Still incomplete?
                                      │
                                      ▼
                                3-day reminder
                                      │
                                      ▼
                                    STOP
```

The system should always treat the database as the source of truth and re-check the merchant's current state immediately before sending any scheduled lifecycle email.
